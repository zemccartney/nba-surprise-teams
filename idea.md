I have an idea: in `MAINTENANCE.md`, I've documented the rules I want my data to follow to ensure the system runs as expected. In so doing, I highlighted
scenarios where I can break the system by entering data, where the only way I'll notice said breaks is through building or carefully manually testing. That is,
a downside of architecting around static rendering is a reduced ability to react to bad data or errors in real time, thereby limiting observability.

So I'm thinking: would it make sense to develop some sort of system or tooling or test suite to check that my data follows the rules documented therein and any
others, to give me more comprehensive observability over my data entry and how well I'm following said rules. For example, not that this has to be a test suite,
but I've been imagining running a test suite during builds, such that any broken rules would block the build. That's the key: I want to prevent releasing builds
that, while maybe not technically invalid, do not meet my requirements.

Other problems on my mind:

- no referential integrity on data. astro's reference links records by id matches, but it does not validate those links via runtime error. you have to discover
  broken cases through usage. this is not just an issue with games data, which doesn't use reference due to needing to avoid astro's references in that data, for the sake of interoperating with live game results
- in an astro limitation, ids in json files aren't guaranteed to be unique; not sweating this, but would love peace of mind of guaranteeing id uniqueness
- hard-coded rules in various charts. for example, in src/components/charts/team-season.scatter.tsx, you can see some TODOs about various hardcodings, where
  I needed more exact control of chart dimensions at the expense of adapting to data i.e. it's possible, and would break subtly, that adding data will break those hardcoding
  assumptions, leading to chart layout issues.

Ask me one question at a time so we can develop a thorough, step-by-step spec for this idea. Each question should build on my previous answers, and our end goal is to have a detailed specification I can hand off to a developer. Let’s do this iteratively and dig into every relevant detail. Remember, only one question at a time.

You should evaluate `MAINTENACE.md`. Think hard. Evaluate for clarity. Pinpoint any seeming inaccuracies, bad wordings, misunderstandings, or mistakes on my part.
