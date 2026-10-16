// Existing authoritative resource ledger scale; one unit is 1/120 resource.
export const RESOURCE_UNITS=120;
// Match start balances in whole resources (the Economy ledger and the GameState mirror both start here).
export const startingResources={gold:250,wood:180,iron:30} as const;
