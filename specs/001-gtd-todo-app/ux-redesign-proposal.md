# P6: UX Redesign - Proposition Complète

**Feature**: 001-gtd-todo-app
**Phase**: 6.0 (nouvelle phase prioritaire)
**Date**: 2025-12-04
**Status**: Proposition

---

## Analyse de l'Existant

### Problèmes Identifiés

#### 1. Navigation Surchargée (8 onglets)
```
Actuel: Inbox | Clarify | Contexts | Projects | Next Actions | Waiting For | Someday | Reference
```
- Trop d'éléments de même poids visuel
- Difficile de distinguer les catégories
- Scroll horizontal sur tablette
- L'utilisateur ne sait pas par où commencer

#### 2. Fragmentation des Vues de Tâches
- 4 pages séparées pour les listes (Next Actions, Waiting For, Someday, Reference)
- Pas de vue unifiée "toutes mes tâches"
- Filtre par contexte uniquement sur Next Actions
- Impossible de voir rapidement le statut global

#### 3. Clarification Déconnectée
- Le bouton Clarify dans l'inbox ne permet pas de clarifier UNE tâche spécifique
- Il faut aller sur /clarify qui traite les tâches dans l'ordre
- Pas de "clarify this task" inline

#### 4. Projets Isolés
- Les projets sont une page séparée, non intégrée au flux
- Les tâches d'un projet ne sont pas visibles dans les listes principales
- Pas de vue "tâches par projet" dans l'interface unifiée

#### 5. Contextes Sous-Utilisés
- Page de gestion séparée
- Filtre uniquement sur Next Actions
- Pas de quick-filter global

---

## Vision: "Focus Mode GTD"

### Philosophie
> **Une seule interface principale avec des modes de vue, pas des pages séparées.**

L'utilisateur doit pouvoir :
1. Capturer en < 3 secondes depuis n'importe où
2. Clarifier une tâche en 1 clic depuis l'inbox
3. Voir TOUTES ses tâches avec des filtres rapides
4. Basculer entre les vues sans navigation

---

## Nouvelle Architecture UX

### Navigation Simplifiée (3 sections)

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 GTD Todo    [Inbox (5)]    [Actions]    [⚙️ Settings]   │
└─────────────────────────────────────────────────────────────┘
```

| Section | Description |
|---------|-------------|
| **Inbox** | Capture + Clarification (fusionnées) |
| **Actions** | Vue unifiée avec filtres (remplace 4 pages + Projects + Contexts) |
| **Settings** | Compte, préférences, contextes personnalisés |

---

## Parcours UX Complets

### Parcours 1: Capture Rapide

```
┌────────────────────────────────────────────────────────────┐
│  🎯 GTD Todo    [Inbox (5)]    [Actions]    [⚙️]           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ + Capturer une idée...                          [⏎]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  INBOX (5 éléments à clarifier)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ○ Appeler le plombier          [Clarifier] [🗑️]     │  │
│  │ ○ Idée article blog            [Clarifier] [🗑️]     │  │
│  │ ○ Répondre email Marie         [Clarifier] [🗑️]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Flux:**
1. User tape dans le champ → Entrée → Tâche ajoutée à l'inbox
2. Raccourci Ctrl+N depuis n'importe quelle page → Modal capture
3. Bouton "Clarifier" sur chaque tâche → Ouvre wizard inline

---

### Parcours 2: Clarification Inline

```
┌────────────────────────────────────────────────────────────┐
│  CLARIFIER: "Appeler le plombier"                     [✕]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Est-ce actionnable ?                                      │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │   ✓ OUI    │  │     NON     │                         │
│  └─────────────┘  └─────────────┘                         │
│                                                            │
│  ▼ Si OUI:                                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Quelle est la prochaine action concrète ?            │  │
│  │ [Appeler le plombier pour RDV fuite cuisine      ]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Ça prend moins de 2 minutes ?                             │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │  FAIRE NOW │  │  REPORTER   │                         │
│  └─────────────┘  └─────────────┘                         │
│                                                            │
│  ▼ Si REPORTER:                                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Type:  ○ Next Action  ○ Waiting For  ○ Someday    │   │
│  │        ○ Référence    ○ Projet (multi-étapes)     │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ Contexte: [@Téléphone ▼]   Énergie: [Moyenne ▼]   │   │
│  │ Projet:   [Aucun ▼]        Échéance: [__ / __ ]   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│           [Annuler]                    [Enregistrer]       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Améliorations:**
- Clarification sur UNE tâche spécifique (pas en file)
- Tout dans une modal/panneau inline
- Pas de navigation vers une autre page
- Choix du type directement (pas wizard multi-étapes)

---

### Parcours 3: Vue Actions Unifiée

```
┌────────────────────────────────────────────────────────────┐
│  🎯 GTD Todo    [Inbox (5)]    [Actions ●]    [⚙️]         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─ FILTRES ───────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  STATUT          CONTEXTE           PROJET          │  │
│  │  ┌─────────┐     ┌─────────────┐   ┌────────────┐   │  │
│  │  │● Tous   │     │ Tous        │   │ Tous       │   │  │
│  │  │○ Next   │     │ @Bureau (8) │   │ Refonte UX │   │  │
│  │  │○ Waiting│     │ @Maison (3) │   │ Vacances   │   │  │
│  │  │○ Someday│     │ @Tel (2)    │   │ Blog       │   │  │
│  │  │○ Ref    │     │ @Courses    │   └────────────┘   │  │
│  │  └─────────┘     └─────────────┘                    │  │
│  │                                                      │  │
│  │  [🔍 Rechercher...]        [Tri: Date ▼]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ═══════════════════════════════════════════════════════  │
│  NEXT ACTIONS (15)                              [▼ Replier]│
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ☐ Appeler plombier        @Tel    ⚡Haute   📅 Demain │  │
│  │ ☐ Rédiger rapport Q4      @Bureau ⚡Haute   📅 Lun   │  │
│  │ ☐ Acheter cadeau Marie    @Courses         📅 Ven   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  WAITING FOR (3)                                [▼ Replier]│
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⏳ Réponse devis garage    → Jean    Depuis 5 jours  │  │
│  │ ⏳ Validation budget       → Marie   Depuis 2 jours  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  SOMEDAY/MAYBE (8)                              [▶ Déplier]│
│  RÉFÉRENCE (12)                                 [▶ Déplier]│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Caractéristiques:**
- **UNE SEULE PAGE** pour toutes les tâches clarifiées
- Sections repliables par type (Next/Waiting/Someday/Ref)
- Filtres combinables (statut + contexte + projet)
- Compteurs sur chaque filtre
- Recherche globale
- Tri personnalisable

---

### Parcours 4: Focus sur un Projet

```
┌────────────────────────────────────────────────────────────┐
│  PROJET: Refonte UX Application                    [✏️][🗑️]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Objectif: Simplifier la navigation et unifier les vues   │
│  Statut: 🟢 Actif    Progression: ████████░░ 80%          │
│                                                            │
│  ───────────────────────────────────────────────────────  │
│                                                            │
│  + Ajouter une action à ce projet...                       │
│                                                            │
│  PROCHAINES ACTIONS (3)                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ☐ Créer maquettes Figma        @Bureau   📅 Lun     │  │
│  │ ☐ Valider avec équipe          @Réunion             │  │
│  │ ☐ Implémenter composant Nav    @Bureau              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  EN ATTENTE (1)                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⏳ Feedback design → Sophie    Depuis 3 jours        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  TERMINÉES (5)                                  [▶ Voir]   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Accès au projet:**
- Depuis la vue Actions → Clic sur badge projet
- Depuis le filtre Projet → Ouvre le détail
- Depuis Settings → Gestion des projets

---

### Parcours 5: Revue Hebdomadaire (P6 original → devient P7)

```
┌────────────────────────────────────────────────────────────┐
│  REVUE HEBDOMADAIRE                           Étape 2/6    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✓ GET CLEAR                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  │ ✓ Inbox vidée (0 éléments)                           │  │
│  │ ✓ Emails traités                                     │  │
│  │ ✓ Notes capturées                                    │  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                            │
│  ● GET CURRENT                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  │ ○ Revoir projets (3 sans prochaine action)           │  │
│  │   ┌─────────────────────────────────────────────┐    │  │
│  │   │ ⚠️ Vacances Grèce - Pas de next action      │    │  │
│  │   │   [+ Ajouter action] [Mettre en pause]      │    │  │
│  │   └─────────────────────────────────────────────┘    │  │
│  │ ○ Revoir Waiting For (2 items > 7 jours)             │  │
│  │ ○ Revoir calendrier semaine prochaine                │  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                            │
│  ○ GET CREATIVE                                            │
│                                                            │
│           [← Précédent]              [Continuer →]         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Structure des Composants

### Nouvelle Hiérarchie

```
App
├── PublicRoutes
│   ├── /login
│   ├── /register
│   └── /password-reset/*
│
└── AuthenticatedLayout
    ├── TopBar (simplifié: 3 items)
    │   ├── Logo → /inbox
    │   ├── Inbox (badge count)
    │   ├── Actions
    │   └── Settings (dropdown)
    │
    ├── QuickCaptureModal (global, Ctrl+N)
    │
    └── Routes
        ├── /inbox → InboxPage (capture + clarify inline)
        ├── /actions → ActionsPage (vue unifiée avec filtres)
        ├── /actions?project=:id → Vue filtrée projet
        ├── /projects/:id → ProjectDetailPage
        ├── /review → WeeklyReviewPage
        └── /settings/* → SettingsPages
            ├── /settings/account
            ├── /settings/contexts
            └── /settings/projects
```

### Composants Clés à Créer/Modifier

| Composant | Action | Description |
|-----------|--------|-------------|
| `TopBar` | MODIFIER | Réduire à 3 items + dropdown settings |
| `InboxPage` | MODIFIER | Ajouter bouton Clarifier par tâche |
| `ClarifyPanel` | CRÉER | Panneau de clarification inline (pas wizard) |
| `ActionsPage` | CRÉER | Vue unifiée remplaçant 4 pages |
| `FilterBar` | CRÉER | Filtres combinés (statut/contexte/projet) |
| `CollapsibleSection` | CRÉER | Sections repliables par type |
| `TaskRowUnified` | CRÉER | Ligne de tâche avec badges et actions |
| `ProjectDetailPage` | MODIFIER | Intégrer la vue des tâches |
| `SettingsLayout` | CRÉER | Layout pour pages settings |
| `QuickCaptureModal` | MODIFIER | Rendre global (accessible partout) |

---

## Mapping Ancien → Nouveau

| Ancienne Route | Nouvelle Route | Notes |
|----------------|----------------|-------|
| /inbox | /inbox | Conservée, + clarify inline |
| /clarify | SUPPRIMÉE | Intégré dans /inbox |
| /next-actions | /actions?status=next | Fusionnée |
| /waiting-for | /actions?status=waiting | Fusionnée |
| /someday-maybe | /actions?status=someday | Fusionnée |
| /reference | /actions?status=reference | Fusionnée |
| /contexts | /settings/contexts | Déplacée |
| /projects | /settings/projects | Liste dans settings |
| /projects/:id | /projects/:id | Conservée |
| /account/settings | /settings/account | Réorganisée |
| /account/delete | /settings/account | Intégrée |

---

## Impact Backend

### Aucune modification requise
- Les endpoints API restent les mêmes
- Les entités ne changent pas
- Seule la présentation frontend change

### Optimisations possibles (optionnel)
- Endpoint `/api/tasks/all` avec filtres combinés
- Endpoint `/api/dashboard/stats` pour compteurs

---

## Plan d'Implémentation

### Phase 6.1: Refonte Navigation (CRITIQUE)
- [ ] [P6-001] Créer nouveau TopBar simplifié (3 items)
- [ ] [P6-002] Créer SettingsLayout avec sous-navigation
- [ ] [P6-003] Déplacer ContextsPage vers /settings/contexts
- [ ] [P6-004] Migrer routes account vers /settings/account
- [ ] [P6-005] Tests navigation

### Phase 6.2: Clarification Inline
- [ ] [P6-006] Créer ClarifyPanel component (panneau latéral/modal)
- [ ] [P6-007] Modifier InboxPage - bouton Clarifier par tâche
- [ ] [P6-008] Implémenter logique clarification inline
- [ ] [P6-009] Supprimer /clarify page et ClarifyWizard
- [ ] [P6-010] Tests clarification inline

### Phase 6.3: Vue Actions Unifiée
- [ ] [P6-011] Créer ActionsPage avec sections repliables
- [ ] [P6-012] Créer FilterBar component (statut/contexte/projet)
- [ ] [P6-013] Créer CollapsibleSection component
- [ ] [P6-014] Créer TaskRowUnified component
- [ ] [P6-015] Implémenter filtres combinés (query params)
- [ ] [P6-016] Supprimer NextActionsPage, WaitingForPage, SomedayMaybePage, ReferencePage
- [ ] [P6-017] Tests vue unifiée

### Phase 6.4: Intégration Projets
- [ ] [P6-018] Modifier ProjectDetailPage - afficher tâches par statut
- [ ] [P6-019] Ajouter filtre projet dans ActionsPage
- [ ] [P6-020] Quick-add tâche depuis projet
- [ ] [P6-021] Tests intégration projets

### Phase 6.5: Polish & Mobile
- [ ] [P6-022] Drawer navigation mobile
- [ ] [P6-023] Responsive FilterBar
- [ ] [P6-024] Animations transitions
- [ ] [P6-025] Tests E2E parcours complets

---

## Métriques de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Clics pour clarifier 1 tâche | 3-4 | 1 |
| Pages dans navigation | 8 | 3 |
| Temps pour voir toutes les tâches | N/A (impossible) | < 2s |
| Clics pour filtrer par contexte | 2 (aller sur Next Actions + sidebar) | 1 |

---

## Wireframes Clés

### Mobile - Navigation

```
┌─────────────────────┐
│ ☰  GTD Todo    [+]  │  <- Hamburger + Quick capture
├─────────────────────┤
│                     │
│  [Inbox content]    │
│                     │
├─────────────────────┤
│ 📥    📋    ⚙️      │  <- Bottom nav: Inbox, Actions, Settings
│ (5)                 │
└─────────────────────┘
```

### Mobile - Filtres (Actions)

```
┌─────────────────────┐
│ Actions        [🔍] │
├─────────────────────┤
│ [All ▼] [Context ▼] │  <- Dropdowns au lieu de sidebar
├─────────────────────┤
│                     │
│ NEXT ACTIONS (8)    │
│ ├─ Task 1           │
│ ├─ Task 2           │
│ └─ Task 3           │
│                     │
│ WAITING (2)    [▶]  │
│ SOMEDAY (5)    [▶]  │
│                     │
└─────────────────────┘
```

---

## Questions Ouvertes

1. **Garder /clarify comme option ?**
   - Certains users préfèrent le mode "traitement en file"
   - Option: garder accessible via bouton "Traiter tout" dans inbox

2. **Projets dans Settings ou section propre ?**
   - Settings = gestion/admin des projets
   - Vue projet = accessible via filtre dans Actions
   - Détail projet = route dédiée

3. **Revue hebdomadaire - où la mettre ?**
   - Option A: Bouton dans Settings
   - Option B: Notification/rappel qui ouvre la page
   - Option C: Section dans le dashboard (si on en crée un)

---

## Prochaines Étapes

1. **Validation** - Approuver cette proposition
2. **Maquettes** - Créer maquettes Figma détaillées
3. **Implémentation** - Suivre le plan Phase 6.1 → 6.5
4. **Migration** - Prévoir redirections des anciennes routes
5. **Tests** - Valider tous les parcours UX

