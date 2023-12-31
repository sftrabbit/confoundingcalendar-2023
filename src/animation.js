class AnimationHandler {
  constructor () {
    this.pendingTransactions = []
    this.transactionActive = false
  }

  queueTransaction (transaction) {
    this.pendingTransactions.push(transaction)
  }

  hasPendingTransactions () {
    return this.pendingTransactions.length > 0
  }

  getActiveTransaction (timestamp) {
    if (this.transactionActive) {
      return this.pendingTransactions[0]
    }

    if (this.pendingTransactions.length === 0) {
      return null
    }

    this.transactionActive = true
    for (const animation of this.pendingTransactions[0]) {
      const delaySeconds = animation.delaySeconds || 0
      animation.startTimestamp = timestamp + delaySeconds * 1000
      animation.endTimestamp = timestamp + (delaySeconds + animation.durationSeconds) * 1000
    }
    return this.pendingTransactions[0]
  }

  stopTransaction () {
    this.pendingTransactions.shift()
    this.transactionActive = false
  }

  clear () {
    this.pendingTransactions = []
    this.transactionActive = false
  }
}

export default AnimationHandler