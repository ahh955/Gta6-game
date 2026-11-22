// District jobs for Solmar City 3D: seven side jobs, one per district,
// each from a named local who pays cash and raises district standing.
// Jobs are the honest way to earn — and standing is what makes locals
// hide you from the police (see police.js hiding). The STATS checklist
// tracks them (District jobs x/7); the MAP tab lists them with markers.
export const JOBS = [
  {
    id: 'ice-run', name: 'ICE FOR THE MARKET', district: 'Coral Docks',
    giver: 'SAL THE FISHMONGER', pay: 650, standing: 6,
    task: 'Haul three blocks of ice to the night market before they melt.',
  },
  {
    id: 'fresh-catch', name: 'FRESH CATCH', district: 'Old Port',
    giver: 'CAPTAIN BRINE', pay: 700, standing: 6,
    task: 'Collect the morning catch from the trawler and deliver it dockside.',
  },
  {
    id: 'water-terraces', name: 'WATER FOR THE TERRACES', district: 'Downtown',
    giver: 'MRS. ALBA', pay: 500, standing: 5,
    task: 'The terraces are dry. Run the water truck up the hill, twice.',
  },
  {
    id: 'karaoke-speakers', name: 'KARAOKE SPEAKERS', district: 'Casino Row',
    giver: 'DJ NEON', pay: 800, standing: 7,
    task: 'The Row needs speakers by midnight. No questions, no scratches.',
  },
  {
    id: 'medicine-boats', name: 'MEDICINE FOR THE BOATS', district: 'Marina Bay',
    giver: 'DOC HARROW', pay: 600, standing: 6,
    task: 'Ferry the clinic supplies out to the liveaboard boats.',
  },
  {
    id: 'courier-clerks', name: 'COURIER FOR THE CLERKS', district: 'Strand Boulevard',
    giver: 'MS. QUILL', pay: 900, standing: 7,
    task: 'Sealed parcels, five stops, and the clerks pay for discretion.',
  },
  {
    id: 'lanterns-green', name: 'LANTERNS FOR THE GREEN', district: 'Solmar Strand',
    giver: 'OLD MAN TULO', pay: 550, standing: 5,
    task: 'Hang the festival lanterns along the Strand before dusk.',
  },
];

export function getJob(id) {
  return JOBS.find((j) => j.id === id) || JOBS[0];
}

export function jobInDistrict(district) {
  return JOBS.find((j) => j.district === district) || null;
}

// Complete a job: returns the payout and standing gain, or null when the
// job is already done. `done` is a plain object { [id]: true }.
export function completeJob(done, id) {
  if (done[id]) return null;
  const job = getJob(id);
  return {
    job: job.name,
    pay: job.pay,
    standing: job.standing,
    district: job.district,
    done: { ...done, [id]: true },
  };
}
