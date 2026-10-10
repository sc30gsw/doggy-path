# doggy-path

An iOS and Android app that proposes dog-walking courses. The Owner registers their dog once. Then, whenever they want to walk, they say how they feel today and get loop courses ranked for that dog and that day.

## How it works

1. **Sign up and register the dog.** The Owner signs up with email and password and fills in a Dog Profile: their own name, and the dog's name, Breed, Birth Month and sex. Weight and Dog Memo are optional. The profile can be edited later from the Profile tab.
2. **Enter Course Conditions.** On the Home tab, "コースを提案してもらう" opens a sheet for Mood, Today's Memo, Target Distance, Target Time and Start Point. Every field may be left empty.
3. **Get Walk Courses.** The app builds several loop Course Candidates around the Start Point. [Jev](https://docs.typesafe.ai/introduction) checks the conditions and ranks the candidates by Body Fit and Mood Fit. The top three are shown on a map with the reasons they were picked.

Domain terms are defined in [GLOSSARY.md](./GLOSSARY.md), and key decisions are recorded in [docs/adr/](./docs/adr/).

## Stack

- [Expo](https://docs.expo.dev) with Expo Router, `@expo/ui` and `react-native-maps`
- [Convex](https://docs.convex.dev) for the backend, with Convex Auth for sign-in
- [Jev](https://docs.typesafe.ai/introduction) (TypeSafe) to make judgments
- [OpenRouteService](https://openrouteservice.org) for loop routes and the Overpass API for map features
- [Valibot](https://valibot.dev) to validate forms and external data

## Development

```bash
bun install
bunx convex dev   # starts the Convex backend and writes EXPO_PUBLIC_CONVEX_URL to .env.local
bunx expo start
```

API keys for Jev and OpenRouteService go in Convex environment variables, never in the app.

```bash
bun run lint         # oxlint
bun run format:check # oxfmt
bunx tsc --noEmit
```
