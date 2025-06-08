// src/lib/analytics/xgCalculator.ts
import { ShotEventData } from '@/types/eventData'; // Adjust path as needed

// Optional: Define pitch dimensions if used for distance/angle
const PITCH_LENGTH = 105; // Example: Standard FIFA pitch length in meters
const PITCH_WIDTH = 68;  // Example: Standard FIFA pitch width in meters
const GOAL_CENTER_Y = PITCH_WIDTH / 2;
// Assuming coordinates are from (0,0) at one corner to (PITCH_LENGTH, PITCH_WIDTH) at the opposite.
// And goal is along the line x = PITCH_LENGTH (or x = 0 if attacking other way).
// For simplicity, let's assume attack is always towards increasing X, goal at x = PITCH_LENGTH.
const GOAL_LINE_X = PITCH_LENGTH;

export function calculateXg(
  shotData: ShotEventData,
  coordinates?: { x: number; y: number } // Assuming coordinates are in meters, (0,0) bottom-left, (105,68) top-right
): number {
  let xg = 0.08; // Base average xG for a typical shot

  // --- Situation Adjustments ---
  if (shotData.situation === 'penalty') {
    return 0.76; // Penalties have a fixed high xG according to most models
  }
  if (shotData.situation === 'direct_free_kick') {
    xg += 0.04;
  }
  if (shotData.situation === 'corner_related' && shotData.shot_type === 'header') {
    xg += 0.05; // Headers from corners are generally good chances
  } else if (shotData.situation === 'corner_related') {
    xg += 0.02; // Other shots from corners
  }
  if (shotData.situation === 'fast_break') {
    xg += 0.03; // Fast breaks can lead to better chances
  }

  // --- Shot Type Adjustments ---
  // (Consider if situation already implies shot type, e.g., 'penalty' implies a specific shot type)
  if (shotData.shot_type === 'header' && shotData.situation !== 'corner_related') {
    xg -= 0.01; // General headers might be slightly harder unless from a good setup like a corner
  }
  if (shotData.shot_type === 'volley') {
    xg -= 0.01; // Volleys can be spectacular but are often difficult
  }
  if (shotData.shot_type === 'lob') {
    xg -= 0.02; // Lobs are typically lower probability
  }

  // --- Body Part Adjustments ---
  if (shotData.body_part_used === 'other') { // e.g., weaker foot, chest, etc.
    xg -= 0.02;
  }
  // Note: If body_part_used is 'head', it's often correlated with shot_type 'header'.
  // If 'left_foot' or 'right_foot' is specified, one could adjust if player footedness is known (more advanced).

  // --- Assist Type Adjustments ---
  if (shotData.assist_type === 'through_ball') {
    xg += 0.06; // Through balls often bypass defenders
  } else if (shotData.assist_type === 'pull_back' || shotData.assist_type === 'cut_back') {
    xg += 0.05; // Pull-backs/cut-backs often create high-quality chances
  } else if (shotData.assist_type === 'cross') {
    xg += 0.01; // Crosses are variable; this is a slight average boost
  } else if (shotData.assist_type === 'rebound') {
    xg += 0.04; // Rebounds can be from good positions, but also chaotic
  }

  // --- Basic Distance Modifier (Placeholder & Very Simplified) ---
  if (coordinates && typeof coordinates.x === 'number' && typeof coordinates.y === 'number') {
    // Calculate distance to the center of the goal
    const distance = Math.sqrt(Math.pow(GOAL_LINE_X - coordinates.x, 2) + Math.pow(GOAL_CENTER_Y - coordinates.y, 2));

    if (distance > 25) { // Roughly >25 meters
      xg -= 0.03;
    } else if (distance > 18 && distance <= 25) { // Roughly 18-25 meters
      xg -= 0.01;
    } else if (distance < 10) { // Roughly <10 meters (close range)
      xg += 0.05;
    } else if (distance < 5) { // Very close
        xg += 0.10;
    }

    // Basic angle consideration (very simplified)
    // A wider angle (closer to center) is better.
    // const y_distance_from_center = Math.abs(GOAL_CENTER_Y - coordinates.y);
    // if (y_distance_from_center > 15) { // Shot from a wide angle
    //   xg -= 0.02;
    // }
  }


  // Ensure xG is within a realistic probability range (e.g., 0.01 to 0.95 for non-penalties)
  // Penalties are handled separately.
  return Math.max(0.01, Math.min(xg, 0.95));
}
