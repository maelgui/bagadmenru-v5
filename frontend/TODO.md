# TODO

## Planning — périmètre des données (saison vs. évènements à venir)

Sur la page Planning (`app/src/pages/events/planning.tsx`), les données proviennent de
`upcomingResponsesQuery` / `upcomingDoodleEventsQuery` (`app/src/pages/events/queries.ts`),
qui sont filtrées sur `dateGte: today`. Elles ne couvrent donc que les **évènements à venir**,
pas **toute la saison**.

Conséquences actuelles :
- Le taux de participation (dénominateur `filteredProfiles.length`) porte uniquement sur les
  évènements à venir.
- Le bandeau « Vous n'apparaissez pas encore dans les sondages » se déclenche quand l'utilisateur
  n'a répondu à aucun évènement **à venir** — et non à aucun évènement de la saison.

À décider / faire si l'on veut raisonner sur toute la saison :
- [ ] Ajouter une requête dédiée (réponses/évènements non filtrés par `dateGte`, ou bornés au
      début de saison) pour détecter « n'a répondu à rien de la saison ».
- [ ] Adapter la condition du bandeau et, le cas échéant, le calcul du taux en conséquence.
