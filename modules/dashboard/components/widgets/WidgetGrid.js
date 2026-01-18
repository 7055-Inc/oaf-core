import React, { useState, useEffect, useRef } from 'react';
import { authenticatedApiRequest } from '../../../../lib/auth';
import { authApiRequest, API_ENDPOINTS } from '../../../../lib/apiUtils';
import WidgetRenderer from './WidgetRenderer';
import styles from './WidgetGrid.module.css';

const GRID_COLS = 6;
const GRID_ROWS = 200;
const VISIBLE_EMPTY_ROWS = 5;

export default function WidgetGrid() {
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
      const response = await authApiRequest('api/dashboard-widgets/layout');
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

      const response = await authApiRequest(API_ENDPOINTS.DASHBOARD_WIDGETS_LAYOUT, {
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

    // If dropping on an occupied cell, move that widget to next available spot
    if (newGrid[toRow][toCol] && !newGrid[toRow][toCol].is_admin_locked) {
      const displacedWidget = newGrid[toRow][toCol];
      
      // Find next empty spot starting from the top
      let placed = false;
      for (let row = 0; row < GRID_ROWS && !placed; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          if (!newGrid[row][col]) {
            newGrid[row][col] = displacedWidget;
            placed = true;
            break;
          }
        }
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

  // Check if user has any widgets (including admin-locked ones like shortcuts)
  const hasAnyWidgets = grid.some(row => 
    row.some(cell => cell !== null)
  );

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fas fa-spinner fa-spin"></i>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Widget Grid Container */}
      <div className={styles.gridContainer}>
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
              style={{
                gridColumn: widget?.config?.gridSpan ? `span ${widget.config.gridSpan}` : undefined
              }}
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
                  
                  <div className={styles.widgetContent}>
                    <WidgetRenderer
                      widgetType={widget.widget_type}
                      config={widget.config}
                      onConfigChange={async (newConfig) => {
                        const newGrid = [...grid];
                        newGrid[row][col].config = newConfig;
                        setGrid(newGrid);
                        await autoSave();
                        // No need to reload - grid state is already updated
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

        {/* Empty State Overlay */}
        {!hasAnyWidgets && (
          <div className={styles.emptyStateOverlay}>
            <div className={styles.emptyStateContent}>
              <h2>It looks like you have not added any shortcuts or widgets installed yet.</h2>
              <p>Select widgets and shortcuts by clicking the '+' symbol next to the matching menu items.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
