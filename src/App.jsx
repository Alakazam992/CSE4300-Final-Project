import { useLayoutEffect, useRef, useState } from "react";
import { SchedulingRound } from "./scheduler.js";
import { practiceWorkload } from "./workload.js";

const processesById = new Map(practiceWorkload.map((process) => [process.id, process]));

function ProcessLabel({ process }) {
  return (
    <span className="process-label" data-color={process.color}>
      <span className="process-id">{process.id}</span>
      <span className="process-name">{process.name}</span>
    </span>
  );
}

function ProcessCard({ process, onRun, onDragStart, onDragEnd }) {
  const fields = [
    ["Burst", process.burst],
    ["Priority", process.priority],
    ["Arrival", process.arrival],
    ["Deadline", process.deadline ?? "—"],
  ];

  return (
    <button
      className="process-card"
      type="button"
      draggable
      onClick={() => onRun(process.id)}
      onDragStart={(event) => onDragStart(event, process.id)}
      onDragEnd={onDragEnd}
    >
      <ProcessLabel process={process} />
      <span className="process-details">
        {fields.map(([label, value]) => (
          <span className="process-field" key={label}>
            <span className="field-label">{label}</span>
            <strong>{value}</strong>
          </span>
        ))}
      </span>
    </button>
  );
}

function CpuTimeline({ timeline }) {
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-heading">
      <div className="panel-heading"><h2 id="timeline-heading">CPU timeline</h2></div>
      {timeline.length === 0 ? (
        <p className="panel-description">Run a process or wait for an arrival to start the timeline.</p>
      ) : (
        <ol className="timeline">
          {timeline.map(({ processId, start, end }) => (
            <li
              className="timeline-segment"
              data-color={processesById.get(processId)?.color ?? "idle"}
              style={{ flexGrow: end - start }}
              key={start}
            >
              <span className="timeline-block">{processId ?? "Idle"}</span>
              <span className="timeline-range">{start}–{end}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RoundScore({ round, completed, sectionRef }) {
  const { averageWait, averageTurnaround, deadlinesMet, deadlinesTotal } = round.score;
  const metrics = [
    ["Average wait", averageWait?.toFixed(1) ?? "—"],
    ["Average turnaround", averageTurnaround?.toFixed(1) ?? "—"],
    ["Deadlines met", deadlinesTotal ? `${deadlinesMet} / ${deadlinesTotal}` : "—"],
  ];

  return (
    <section className="score-section" aria-labelledby="score-heading" tabIndex={-1} ref={sectionRef}>
      <h2 id="score-heading">{round.finished ? "Final score" : "Round score"}</h2>
      <dl className="score-grid">
        {metrics.map(([label, value]) => (
          <div className="panel score-card" key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {round.finished && (
        <div className="panel results">
          <table>
            <caption>Process results</caption>
            <thead>
              <tr>
                <th scope="col">Process</th>
                <th scope="col">Finished</th>
                <th scope="col">Wait</th>
                <th scope="col">Turnaround</th>
                <th scope="col">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((process) => {
                const { finish, wait, turnaround, deadlineMet } = process.result;
                const deadline = deadlineMet === null
                  ? "—"
                  : `${process.deadline} · ${deadlineMet ? "Met" : "Missed"}`;
                return (
                  <tr key={process.id}>
                    <th scope="row"><ProcessLabel process={process} /></th>
                    <td>{finish}</td>
                    <td>{wait}</td>
                    <td>{turnaround}</td>
                    <td className={deadlineMet === false ? "missed" : undefined}>{deadline}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [round, setRound] = useState(() => SchedulingRound.start(practiceWorkload));
  const [announcement, setAnnouncement] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const draggedId = useRef(null);
  const readyList = useRef(null);
  const waitButton = useRef(null);
  const scoreSection = useRef(null);
  const moveFocus = useRef(false);
  const ready = round.ready;
  const upcoming = round.upcoming;
  const completed = round.completed;
  const cpuState = round.finished ? "finished" : ready.length ? "ready" : "waiting";

  useLayoutEffect(() => {
    if (!moveFocus.current) {
      return;
    }
    moveFocus.current = false;
    const nextControl = round.finished
      ? scoreSection.current
      : readyList.current.querySelector("button") ?? waitButton.current;
    nextControl?.focus({ preventScroll: !round.finished });
  }, [round]);

  function updateRound(next, message) {
    if (next === round) {
      return;
    }
    const activeElement = document.activeElement;
    moveFocus.current = readyList.current.contains(activeElement) || activeElement === waitButton.current;
    setRound(next);
    setAnnouncement(next.finished ? `${message} Round complete.` : `${message} ${next.ready.length} ready.`);
  }

  function runProcess(id) {
    const next = round.dispatch(id);
    updateRound(next, `${id} finished at t = ${next.time}.`);
  }

  function waitForArrival() {
    const next = round.waitForArrival();
    updateRound(next, `Clock advanced to t = ${next.time}.`);
  }

  function startDrag(event, id) {
    draggedId.current = id;
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
  }

  function clearDrag() {
    draggedId.current = null;
    setIsDragOver(false);
  }

  function dragOverCpu(event) {
    if (draggedId.current !== null) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  }

  function dropOnCpu(event) {
    if (draggedId.current === null) {
      return;
    }
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id === draggedId.current) {
      runProcess(id);
    }
    clearDrag();
  }

  function restartRound() {
    clearDrag();
    setRound(SchedulingRound.start(practiceWorkload));
    setAnnouncement("Round restarted at t = 0.");
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-content">
          <div className="brand"><span className="chip-icon" aria-hidden="true" />Scheduler Lab</div>
          <button className="secondary-button" type="button" onClick={restartRound}>Restart round</button>
        </div>
      </header>

      <main className="shell">
        <div className="round-heading">
          <div>
            <h1>You are the scheduler.</h1>
            <p>Choose when each process gets the CPU. Finish them all and see how your schedule scores.</p>
          </div>
          <dl className="round-stats">
            <div><dt>Clock</dt><dd>t = {round.time}</dd></div>
            <div><dt>Completed</dt><dd>{completed.length} / {round.processes.length}</dd></div>
          </dl>
        </div>

        <div className="board">
          <section className="panel queue-panel" aria-labelledby="queue-heading">
            <div className="panel-heading">
              <h2 id="queue-heading">Ready queue</h2>
              <span className="count">{ready.length}</span>
            </div>
            <p className="panel-description">Drag a process onto the CPU or select its card to run it.</p>
            <ul className="process-list" ref={readyList}>
              {ready.map((process) => (
                <li key={process.id}>
                  <ProcessCard process={process} onRun={runProcess} onDragStart={startDrag} onDragEnd={clearDrag} />
                </li>
              ))}
            </ul>
            {ready.length === 0 && (
              <p className="empty-queue">{round.finished ? "All processes completed." : "No processes are ready yet."}</p>
            )}
          </section>

          <div className="board-sidebar">
            <section className="panel cpu-panel" aria-labelledby="cpu-heading">
              <div className="panel-heading">
                <h2 id="cpu-heading">CPU</h2>
                <span className="cpu-status">{round.finished ? "Complete" : "Idle"}</span>
              </div>
              <div
                className={isDragOver ? "drop-zone drag-over" : "drop-zone"}
                data-state={cpuState}
                onDragOver={dragOverCpu}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={dropOnCpu}
              >
                <span className="chip-icon cpu-icon" aria-hidden="true" />
                <p className="cpu-prompt">
                  {round.finished ? "All processes finished" : ready.length ? "Drop a process here" : "Waiting for a process"}
                </p>
                {!round.finished && (
                  <p className="cpu-detail">
                    {ready.length ? "Each process runs to completion." : "Advance to the next arrival."}
                  </p>
                )}
              </div>
            </section>

            <section className="panel arrivals-panel" aria-labelledby="arrivals-heading">
              <div className="panel-heading">
                <h2 id="arrivals-heading">Upcoming arrivals</h2>
                <span className="count">{upcoming.length}</span>
              </div>
              {upcoming.length > 0 ? (
                <>
                  <ul className="arrival-list">
                    {upcoming.map((process) => (
                      <li className="arrival" key={process.id}>
                        <ProcessLabel process={process} />
                        <span className="arrival-time">t = {process.arrival}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="secondary-button wait-button" type="button" onClick={waitForArrival} ref={waitButton}>
                    Wait until t = {upcoming[0].arrival}
                  </button>
                </>
              ) : (
                <p className="panel-description">All processes have arrived.</p>
              )}
            </section>
          </div>
        </div>

        <CpuTimeline timeline={round.timeline} />
        <RoundScore round={round} completed={completed} sectionRef={scoreSection} />
        <p className="visually-hidden" role="status">{announcement}</p>
      </main>
    </>
  );
}
