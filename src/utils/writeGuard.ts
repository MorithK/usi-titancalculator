export type WriteGuard = {
    begin: () => boolean
    end: () => void
  }