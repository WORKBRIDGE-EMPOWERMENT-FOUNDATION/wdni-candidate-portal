// The seven WDNI programme stages, drawn as a route. Shown on the landing page on the dark hero.
const STAGES = [
  { title: "Registration", note: "Recruited through communities and networks" },
  { title: "Screening & verification", note: "Identity checks and your candidate file" },
  { title: "Professional training", note: "Technical, safety and workplace skills" },
  { title: "Assessment & certification", note: "Tested against institutional standards" },
  { title: "Employment preparation", note: "Digital profile and workplace readiness" },
  { title: "Placement", note: "Matched with employers and fleets" },
  { title: "Monitoring & welfare", note: "Ongoing support on the job" },
];

export function RouteMap({ current = 1 }: { current?: number }) {
  return (
    <ol className="grid lg:grid-cols-7">
      {STAGES.map((stage, i) => {
        const state = i < current ? "done" : i === current ? "current" : "next";
        const last = i === STAGES.length - 1;
        return (
          <li key={stage.title} className="relative flex gap-4 pb-7 last:pb-0 lg:flex-col lg:gap-4 lg:pb-0 lg:pr-4">
            {!last &&
              (i < current ? (
                <span aria-hidden className="absolute left-[11px] top-6 h-full w-[3px] origin-top animate-draw-y bg-accent [animation-delay:700ms] lg:left-3 lg:top-[11px] lg:h-[3px] lg:w-full lg:origin-left lg:animate-draw-x" />
              ) : (
                <>
                  <span aria-hidden className="dash-y absolute left-[11px] top-7 h-[calc(100%-8px)] w-[3px] text-white/30 lg:hidden" />
                  <span aria-hidden className="dash-x absolute left-8 top-[11px] hidden h-[3px] w-[calc(100%-20px)] text-white/30 lg:block" />
                </>
              ))}
            <span
              className={`relative z-10 grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full border-[3px] ${
                state === "done"
                  ? "border-accent bg-accent"
                  : state === "current"
                    ? "animate-beacon border-accent bg-navy-950 [animation-delay:1.5s]"
                    : "border-white/35 bg-navy-950"
              }`}
            >
              {state === "current" && <span className="h-2 w-2 rounded-full bg-accent" />}
              {state === "done" && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-navy-950" aria-hidden>
                  <path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div className="-mt-0.5 lg:mt-0">
              <p className={`text-[15px] font-bold leading-snug ${state === "next" ? "text-white/75" : "text-white"}`}>
                {stage.title}
              </p>
              {state === "current" ? (
                <p className="mt-1 inline-block rounded bg-accent px-1.5 pb-0.5 pt-1 text-xs font-bold leading-none text-navy-950">
                  You are here
                </p>
              ) : (
                <p className="mt-1 text-[13px] leading-snug text-white/55">{stage.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
