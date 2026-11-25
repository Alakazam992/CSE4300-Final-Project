export class SchedulingRound {
  constructor(processes, time = 0, timeline = []) {
    this.time = time;
    this.processes = processes;
    this.timeline = timeline;
  }

  static start(workload) {
    return new SchedulingRound(workload.map((process) => ({ ...process, result: null })));
  }

  get ready() {
    return this.processes.filter((process) => !process.result && process.arrival <= this.time);
  }

  get upcoming() {
    return this.processes
      .filter((process) => process.arrival > this.time)
      .sort((first, second) => first.arrival - second.arrival);
  }

  get completed() {
    return this.processes.filter((process) => process.result);
  }

  get finished() {
    return this.processes.every((process) => process.result);
  }

  dispatch(processId) {
    const process = this.ready.find((candidate) => candidate.id === processId);
    if (!process) {
      return this;
    }

    const start = this.time;
    const finish = start + process.burst;
    const deadlineMet = process.deadline == null ? null : finish <= process.deadline;
    const result = {
      start,
      finish,
      wait: start - process.arrival,
      turnaround: finish - process.arrival,
      deadlineMet,
    };
    const processes = this.processes.map((candidate) =>
      candidate.id === processId ? { ...candidate, result } : candidate,
    );
    return new SchedulingRound(processes, finish, [...this.timeline, { processId, start, end: finish }]);
  }

  waitForArrival() {
    const next = this.upcoming[0];
    if (!next) {
      return this;
    }

    const idle = { processId: null, start: this.time, end: next.arrival };
    return new SchedulingRound(this.processes, next.arrival, [...this.timeline, idle]);
  }

  get score() {
    const completed = this.completed;
    const totals = { wait: 0, turnaround: 0, deadlinesMet: 0 };
    for (const { result } of completed) {
      totals.wait += result.wait;
      totals.turnaround += result.turnaround;
      totals.deadlinesMet += Number(result.deadlineMet === true);
    }

    return {
      averageWait: completed.length ? totals.wait / completed.length : null,
      averageTurnaround: completed.length ? totals.turnaround / completed.length : null,
      deadlinesMet: totals.deadlinesMet,
      deadlinesTotal: this.processes.filter((process) => process.deadline != null).length,
    };
  }
}
