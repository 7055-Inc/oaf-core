import React from 'react';
import { State } from 'react-stateface';
import styles from './StateDisplay.module.css';

// Mapping of state abbreviations to full state names
const stateNames = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const StateDisplay = ({ state }) => {
  if (!state) return null;

  // Normalize state input (could be abbreviation or full name)
  const normalizeState = (inputState) => {
    const trimmed = inputState.trim();
    
    // If it's already a 2-letter abbreviation
    if (trimmed.length === 2) {
      return trimmed.toUpperCase();
    }
    
    // If it's a full state name, find the abbreviation
    const abbreviation = Object.keys(stateNames).find(
      key => stateNames[key].toLowerCase() === trimmed.toLowerCase()
    );
    
    return abbreviation || trimmed.substring(0, 2).toUpperCase();
  };

  const stateAbbrev = normalizeState(state);
  const fullStateName = stateNames[stateAbbrev] || state;

  return (
    <div className={styles.stateDisplay}>
      <span className={styles.stateName}>{fullStateName}</span>
      <div className={styles.stateIcon}>
        <State>{stateAbbrev}</State>
      </div>
    </div>
  );
};

export default StateDisplay; 