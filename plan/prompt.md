I want to migrate away from Tailwind

## Desired Outcome

Site is easier to come back to work on b/c I don't have to remember specifics of tailwind, can just
think in CSS

CSS system implemented is organized, well-structured, relatively easy to pick up how to use

## Thinking

- use CSS variables to store system values
- prefer component / page-level CSS i.e. style tags in Astro's templates
- for the react work, not sure how best to handle this
  - consider single stylesheet for chart styles, import on any page where charts used for now? not sure
- keep CSS written to a minimum, only what's used in the site
  - as in, fine to build out a spacing scale based on what we're using
  - but do not try to replicate tailwind in full; we don't need all of the utilities that Tailwind provides
