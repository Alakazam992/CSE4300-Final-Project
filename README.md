# CSE4300-Final-Project

## Scheduler Lab

Scheduler Lab is a React app built with Vite. Use Node.js 20.19+ in the 20.x series, or Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` to generate a production build in `dist/`, or `npm run preview` to serve that build locally.

- Drag a ready process onto the CPU or select its card. It runs to completion, the simulated clock advances by its burst, and processes that arrived in the meantime join the ready queue.
- Use **Wait until t = …** to advance the clock to the next arrival without running a process. The timeline records that interval as idle time.
- Finish all five processes to see the final score and each process's results. **Restart round** resets the same workload so you can try a different order.

Wait time is the number of ticks from arrival to start. Turnaround time is the number of ticks from arrival to completion. During play, both averages use completed processes. Finishing at the deadline counts as meeting it.

`src/App.jsx` contains the React game UI. `src/scheduler.js` handles simulation and scoring, and `src/workload.js` defines the practice round.
