# Vodafone Egypt — dotCMS mobile demo

React Native (Expo) iPhone app showing the Vodafone Egypt demo content from
dotCMS (telcodemo.com on awesomedemo-dev), loaded with GraphQL queries.

```bash
cp .env.example .env.local   # add your dotCMS API token
npm install
npm run ios                  # opens in Expo Go on the iOS simulator
```

Tabs: **Home**, **Plans** and **Vodafone Cash** render the dotCMS pages of the
same name section by section; **Stores** lists the stores on a map. Pull down
to refresh after changing content in dotCMS.

See [AGENTS.md](AGENTS.md) for how the queries and screens fit together.
