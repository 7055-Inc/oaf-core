import React, { useState, useEffect, useRef } from 'react';
import { authenticatedApiRequest } from '../../lib/csrf';
import WidgetRenderer from './WidgetRenderer';
import styles from './DashboardGrid.module.css';

const GRID_COLS = 6;
const GRID_ROWS = 200;
const VISIBLE_EMPTY_ROWS = 5;

export default function DashboardGrid() {
  const [grid, setGrid] = useState(Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)));
  const [loading, setLoading] = useState(true);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  
  const gridRef = useRef(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/dashboard-widgets/layout');
      if (response.ok) {
        const data = await response.json();
        rebuildGridFromLayout([...data.userLayout, ...data.adminLayout]);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const rebuildGridFromLayout = (layout) => {
    const newGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    
    layout.forEach(widget => {
      if (widget.grid_row < GRID_ROWS && widget.grid_col < GRID_COLS) {
        newGrid[widget.grid_row][widget.grid_col] = {
          id: widget.id,
          widget_type: widget.widget_type,
          display_name: widget.display_name,
          config: widget.widget_config,
          is_admin_locked: widget.is_admin_locked
        };
      }
    });
    
    setGrid(newGrid);
  };

  const autoSave = async () => {
    try {
      const layout = [];
      
      // Scan the grid for widgets (exclude admin-locked ones)
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const widget = grid[row][col];
          if (widget && !widget.is_admin_locked) {
            layout.push({
              widget_type: widget.widget_type,
              grid_row: row,
              grid_col: col,
              widget_config: widget.config
            });
          }
        }
      }

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/dashboard-widgets/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout })
      });

      if (!response.ok) {
        throw new Error('Failed to save layout');
      }
    } catch (err) {
    }
  };

  const removeWidget = (row, col) => {
    const newGrid = [...grid];
    newGrid[row][col] = null;
    setGrid(newGrid);
    
    // Auto-save
    setTimeout(() => autoSave(), 100);
  };

  const handleDragStart = (e, row, col) => {
    const widget = grid[row][col];
    if (widget && !widget.is_admin_locked) {
      setDraggedWidget({ widget, fromRow: row, fromCol: col });
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ row, col });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e, toRow, toCol) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedWidget) return;

    const { widget, fromRow, fromCol } = draggedWidget;
    const newGrid = [...grid];

    // If dropping on an occupied cell, move that widget to bottom
    if (newGrid[toRow][toCol] && !newGrid[toRow][toCol].is_admin_locked) {
      const displacedWidget = newGrid[toRow][toCol];
      
      // Find empty spot at bottom for displaced widget
      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        for (let col = 0; col < GRID_COLS; col++) {
          if (!newGrid[row][col]) {
            newGrid[row][col] = displacedWidget;
            break;
          }
        }
        if (newGrid.find((r, i) => i === row && r.some(cell => cell === displacedWidget))) break;
      }
    }

    // Move the dragged widget to new position
    newGrid[fromRow][fromCol] = null;
    newGrid[toRow][toCol] = widget;

    setGrid(newGrid);
    setDraggedWidget(null);
    
    // Auto-save
    setTimeout(() => autoSave(), 100);
  };

  // Calculate visible rows (find last occupied row + VISIBLE_EMPTY_ROWS)
  const getVisibleRows = () => {
    let lastOccupiedRow = -1;
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (grid[row].some(cell => cell !== null)) {
        lastOccupiedRow = row;
        break;
      }
    }
    return Math.min(GRID_ROWS, Math.max(6, lastOccupiedRow + VISIBLE_EMPTY_ROWS + 1));
  };

  const visibleRows = getVisibleRows();

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fas fa-spinner fa-spin"></i>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className={styles.grid}
      style={{ 
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${visibleRows}, 200px)`
      }}
    >
      {Array(visibleRows).fill(null).map((_, row) => 
        Array(GRID_COLS).fill(null).map((_, col) => {
          const widget = grid[row][col];
          const isDropTarget = dragOverCell?.row === row && dragOverCell?.col === col;
          
          return (
            <div
              key={`${row}-${col}`}
              className={`${styles.gridCell} ${widget ? styles.occupied : styles.empty} ${isDropTarget ? styles.dropTarget : ''}`}
              onDragOver={(e) => handleDragOver(e, row, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, row, col)}
            >
              {widget ? (
                <div
                  className={`${styles.widget} ${widget.is_admin_locked ? styles.locked : ''}`}
                  draggable={!widget.is_admin_locked}
                  onDragStart={(e) => handleDragStart(e, row, col)}
                >
                  <div className={styles.widgetHeader}>
                    <span className={styles.widgetTitle}>{widget.display_name}</span>
                    {!widget.is_admin_locked && (
                      <button
                        onClick={() => removeWidget(row, col)}
                        className={styles.removeButton}
                        title="Remove widget"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                    {widget.is_admin_locked && (
                      <i className="fas fa-lock" title="Admin locked"></i>
                    )}
                  </div>
                  
                  <div className={styles.widgetContent}>
                    <WidgetRenderer
                      widgetType={widget.widget_type}
                      config={widget.config}
                      onConfigChange={(newConfig) => {
                        const newGrid = [...grid];
                        newGrid[row][col].config = newConfig;
                        setGrid(newGrid);
                        autoSave();
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
} 