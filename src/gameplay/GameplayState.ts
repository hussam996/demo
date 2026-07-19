export enum GameplayState {
  Loading = 'Loading',
  LevelIntro = 'LevelIntro',
  WaitingForCustomer = 'WaitingForCustomer',
  TakingOrder = 'TakingOrder',
  PreparingOrder = 'PreparingOrder',
  DeliveringOrder = 'DeliveringOrder',
  ValidatingOrder = 'ValidatingOrder',
  CustomerReaction = 'CustomerReaction',
  LevelPaused = 'LevelPaused',
  LevelCompleted = 'LevelCompleted',
  LevelFailed = 'LevelFailed',
}

/** states in which the player may interact with ingredients */
export const INTERACTIVE_STATES: ReadonlySet<GameplayState> = new Set([
  GameplayState.PreparingOrder,
]);
