<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version change: 1.0.0 → 1.1.0 (MINOR: new principles added)

  Modified principles: None

  Added sections:
    - XIII. Feature Flags
    - XIV. API Versioning

  Removed sections: None

  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ Compatible
    - .specify/templates/spec-template.md: ✅ Compatible
    - .specify/templates/tasks-template.md: ✅ Compatible
    - .specify/templates/checklist-template.md: ✅ Compatible
    - .specify/templates/agent-file-template.md: ✅ Compatible

  Follow-up TODOs: None
  ============================================================================
-->

# Project Constitution

## Core Principles

### I. Code Quality

Le code DOIT respecter les standards de qualité suivants:

- **Lisibilité**: Le code DOIT etre auto-documenté avec des noms de variables, fonctions et classes explicites
- **Cohérence**: Le style de code DOIT etre uniforme dans tout le projet (linters et formatters obligatoires)
- **DRY (Don't Repeat Yourself)**: La duplication de code DOIT etre évitée via des abstractions appropriées
- **SOLID**: Les principes SOLID DOIVENT guider l'architecture du code
- **Complexité cyclomatique**: Les fonctions DOIVENT avoir une complexité cyclomatique inférieure a 10
- **Couverture de code**: Le projet DOIT maintenir une couverture de tests minimale de 80%

**Rationale**: Un code de qualité réduit la dette technique, facilite la maintenance et accélere l'intégration de nouveaux développeurs.

### II. Testing Standards

Le projet DOIT suivre une stratégie de tests pyramidale:

- **Tests unitaires**: Chaque TASK DOIT etre couverte par des tests unitaires
  - Isolation complete des dépendances via mocks/stubs
  - Temps d'exécution < 100ms par test
  - Nommage: `test_<fonction>_<scenario>_<resultat_attendu>`
- **Tests d'intégration**: Chaque composant DOIT avoir des tests d'intégration
  - Validation des contrats entre modules
  - Tests de base de données avec transactions rollback
- **Tests E2E (End-to-End)**: Chaque FEATURE DOIT etre testable de bout en bout
  - Scénarios utilisateur complets
  - Tests sur environnement similaire a la production
  - Validation des user stories définies dans spec.md
- **TDD recommandé**: Les tests DEVRAIENT etre écrits avant l'implémentation (Red-Green-Refactor)

**Rationale**: Les tests garantissent la fiabilité du code et permettent des refactorisations sereines.

### III. User Experience

L'expérience utilisateur DOIT guider les décisions de conception:

- **Accessibilité**: Le projet DOIT respecter les standards WCAG 2.1 niveau AA minimum
- **Performance perçue**: Le temps de réponse perçu DOIT etre < 100ms pour les interactions
- **Feedback utilisateur**: Toute action utilisateur DOIT fournir un feedback visuel immédiat
- **Gestion d'erreurs**: Les messages d'erreur DOIVENT etre clairs, actionnables et en langage utilisateur
- **Progressive Enhancement**: Les fonctionnalités DOIVENT fonctionner sans JavaScript quand possible
- **Mobile First**: La conception DOIT prioriser l'expérience mobile

**Rationale**: Une excellente UX augmente l'adoption, réduit le support et améliore la satisfaction utilisateur.

### IV. Performance

Les objectifs de performance DOIVENT etre mesurés et respectés:

- **Temps de réponse API**: p95 < 200ms, p99 < 500ms
- **Time to First Byte (TTFB)**: < 200ms
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle size**: Le JavaScript initial DOIT etre < 200KB gzippé
- **Mémoire**: Pas de memory leaks détectables sur 24h d'utilisation

**Rationale**: La performance impacte directement l'UX, le SEO et les couts d'infrastructure.

### V. Git Flow Discipline

Le projet DOIT suivre Git Flow avec les conventions suivantes:

**Branches principales**:
- `main`: Code de production, toujours déployable
- `develop`: Branche d'intégration pour le développement

**Branches de travail** (nommage obligatoire):
- `feat/<issue-id>-<description>`: Nouvelles fonctionnalités
- `fix/<issue-id>-<description>`: Corrections de bugs
- `hotfix/<issue-id>-<description>`: Corrections urgentes en production
- `release/<version>`: Préparation des releases
- `spec/<issue-id>-<description>`: Modifications des documents de spécification (.specify/*)
- `refactor/<issue-id>-<description>`: Refactorisations sans changement fonctionnel
- `docs/<issue-id>-<description>`: Documentation uniquement
- `test/<issue-id>-<description>`: Ajout ou modification de tests uniquement
- `chore/<issue-id>-<description>`: Maintenance, dépendances, configuration

**Pratiques interdites**:
- JAMAIS de push direct sur `main` ou `develop`
- JAMAIS de force push sur branches partagées
- JAMAIS de merge sans revue de code approuvée
- JAMAIS de commit sur une branche non conforme au nommage

**Rationale**: Git Flow structure le développement, facilite les releases et maintient un historique propre.

### VI. CI/CD Pipeline

Le projet DOIT disposer d'une pipeline CI/CD complete:

**Intégration Continue (CI)** - Obligatoire a chaque push:
- Compilation/Build du projet
- Exécution des linters (ESLint, Prettier, etc.)
- Exécution des tests unitaires
- Analyse de couverture de code
- Analyse de sécurité (SAST)
- Vérification des dépendances vulnérables

**Déploiement Continu (CD)** - Obligatoire pour les merges:
- Tests d'intégration sur environnement de staging
- Tests E2E automatisés
- Déploiement automatique vers staging (develop)
- Déploiement manuel ou semi-automatique vers production (main)
- Rollback automatisé en cas d'échec des health checks

**Quality Gates** (bloquants):
- Build DOIT passer
- Tous les tests DOIVENT passer
- Couverture de code >= 80%
- Aucune vulnérabilité critique
- Revue de code approuvée

**Technologie**: Le choix des outils CI/CD est libre (GitHub Actions, GitLab CI, Jenkins, etc.) mais la pipeline DOIT etre complete et documentée.

**Rationale**: CI/CD garantit la qualité, accélere les déploiements et réduit les erreurs humaines.

### VII. Atomic Commits

Chaque commit DOIT etre atomique et suivre ces regles:

- **Un commit = Une modification logique**: Chaque commit DOIT représenter un changement cohérent et complet
- **Compilable**: Le code DOIT compiler apres chaque commit
- **Testable**: Les tests DOIVENT passer apres chaque commit
- **Réversible**: Chaque commit DOIT pouvoir etre reverté indépendamment

**Format des messages de commit** (Conventional Commits):
```
<type>(<scope>): <description>

[body optionnel]

[footer optionnel]
```

**Types autorisés**:
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage (pas de changement de code)
- `refactor`: Refactorisation
- `test`: Ajout ou modification de tests
- `chore`: Maintenance
- `spec`: Modification des spécifications (.specify/*)

**Rationale**: Les commits atomiques facilitent le débogage, les revues et les rollbacks.

### VIII. Sprint & Task Organization

L'organisation du travail DOIT suivre une structure sprint/feature/task:

**Sprint**:
- Durée fixe (recommandé: 2 semaines)
- Objectifs clairs et mesurables
- Rétrospective a chaque fin de sprint

**Feature (User Story)**:
- Correspond a une branche `feat/` ou `spec/`
- DOIT etre testable de maniere E2E
- DOIT livrer de la valeur utilisateur
- DOIT etre indépendante et déployable seule
- Priorité définie (P1, P2, P3...)

**Task**:
- Unité de travail atomique
- DOIT etre testable de maniere unitaire
- Durée estimée < 4 heures
- Un seul responsable
- Liée a une feature parente

**Génération des tasks.md**:
- Les taches DOIVENT etre organisées par User Story
- Chaque User Story DOIT avoir ses tests (E2E) et ses taches (unitaires)
- Les dépendances entre taches DOIVENT etre explicites
- Le format DOIT suivre: `[ID] [P?] [Story] Description`

**Rationale**: Cette organisation permet un suivi précis, des livraisons incrémentales et une vélocité mesurable.

### IX. Documentation as Code

La documentation DOIT etre traitée comme du code:

- **Versionnée**: Toute documentation DOIT etre dans le dépot Git
- **Revue**: Les changements de documentation DOIVENT passer par PR
- **A jour**: La documentation DOIT etre mise a jour avec chaque feature
- **Automatisée**: La documentation technique DEVRAIT etre générée automatiquement (JSDoc, Swagger, etc.)

**Documents obligatoires**:
- spec.md: Spécifications fonctionnelles
- plan.md: Plan d'implémentation technique
- tasks.md: Liste des taches
- CHANGELOG.md: Historique des changements
- README.md: Guide de démarrage

**Rationale**: Une documentation a jour réduit le temps d'onboarding et évite la perte de connaissances.

### X. Security by Design

La sécurité DOIT etre intégrée des la conception:

- **Principe du moindre privilege**: Les composants n'ont que les permissions nécessaires
- **Validation des entrées**: Toutes les entrées utilisateur DOIVENT etre validées
- **Secrets**: JAMAIS de secrets en dur dans le code (utiliser variables d'environnement)
- **Dépendances**: Les dépendances DOIVENT etre auditées régulierement
- **OWASP Top 10**: Les vulnérabilités OWASP DOIVENT etre activement prévenues

**Rationale**: La sécurité en amont est moins couteuse que la correction de vulnérabilités en production.

### XI. Observability

Le systeme DOIT etre observable:

- **Logging structuré**: Les logs DOIVENT etre au format JSON avec contexte
- **Métriques**: Les KPIs techniques DOIVENT etre exposés (latence, erreurs, saturation)
- **Tracing**: Les requetes distribuées DOIVENT etre traçables (correlation IDs)
- **Alerting**: Les anomalies DOIVENT déclencher des alertes proactives

**Rationale**: L'observabilité permet un diagnostic rapide et une amélioration continue.

### XII. Dependency Management

La gestion des dépendances DOIT suivre ces regles:

- **Pinning**: Les versions DOIVENT etre fixées (lock files)
- **Audit**: Les dépendances DOIVENT etre auditées a chaque build
- **Mise a jour**: Les mises a jour de sécurité DOIVENT etre appliquées sous 48h
- **Minimisation**: N'inclure que les dépendances nécessaires
- **Licence**: Les licences DOIVENT etre compatibles avec le projet

**Rationale**: Une bonne gestion des dépendances réduit les vulnérabilités et la complexité.

### XIII. Feature Flags

Les feature flags DOIVENT etre utilisés pour les déploiements sécurisés:

- **Déploiement découplé**: Le code PEUT etre déployé en production sans etre activé
- **Activation progressive**: Les features DOIVENT pouvoir etre activées par pourcentage d'utilisateurs
- **Kill switch**: Chaque feature flag DOIT permettre une désactivation instantanée
- **Nettoyage**: Les feature flags DOIVENT etre supprimés dans les 30 jours suivant l'activation complete
- **Documentation**: Chaque flag DOIT etre documenté avec son objectif et sa date d'expiration prévue

**Types de flags**:
- `release`: Activation progressive d'une nouvelle fonctionnalité
- `experiment`: Tests A/B et expérimentations
- `ops`: Controle opérationnel (mode maintenance, dégradation gracieuse)
- `permission`: Controle d'acces par utilisateur/groupe

**Pratiques obligatoires**:
- Les flags DOIVENT avoir une valeur par défaut sécurisée (désactivé)
- Les flags DOIVENT etre évalués coté serveur pour les fonctionnalités sensibles
- Les flags expirés DOIVENT déclencher des alertes de nettoyage

**Rationale**: Les feature flags permettent des déploiements sans risque, des rollbacks instantanés et une expérimentation controlée.

### XIV. API Versioning

Les APIs DOIVENT suivre une stratégie de versioning claire:

**Stratégie de versioning** (choisir une et s'y tenir):
- **URL Path** (recommandé): `/api/v1/resource`, `/api/v2/resource`
- **Header**: `Accept: application/vnd.api+json; version=1`
- **Query Parameter**: `/api/resource?version=1`

**Regles de versioning**:
- **MAJOR** (v1 → v2): Changements incompatibles (breaking changes)
- **MINOR** (implicite): Ajouts rétrocompatibles (nouveaux endpoints, champs optionnels)
- **Deprecation**: Les versions DOIVENT etre supportées minimum 6 mois apres annonce de dépréciation

**Pratiques obligatoires**:
- Chaque version DOIT avoir sa documentation OpenAPI/Swagger
- Les breaking changes DOIVENT etre annoncés 3 mois a l'avance minimum
- Les clients DOIVENT recevoir des headers de dépréciation (`Deprecation`, `Sunset`)
- La version N-1 DOIT rester supportée tant que des clients l'utilisent activement

**Gestion des changements**:
- Ajout de champs: Rétrocompatible (pas de nouvelle version)
- Suppression de champs: Breaking change (nouvelle version majeure)
- Modification de format: Breaking change (nouvelle version majeure)
- Nouveaux endpoints: Rétrocompatible (pas de nouvelle version)

**Rationale**: Un versioning clair protege les clients existants et permet une évolution controlée de l'API.

## Development Workflow

### Pull Request Process

1. **Création**: Depuis une branche conforme au nommage Git Flow
2. **Description**: Template PR avec contexte, changements, tests
3. **CI**: Pipeline DOIT passer (build, tests, linting)
4. **Review**: Minimum 1 approbation requise
5. **Merge**: Squash merge vers develop, merge commit vers main

### Code Review Checklist

- [ ] Le code compile et les tests passent
- [ ] Le code respecte les principes de la constitution
- [ ] La couverture de tests est suffisante
- [ ] La documentation est a jour
- [ ] Pas de dette technique non documentée
- [ ] Les performances sont acceptables
- [ ] La sécurité est respectée

## Quality Gates

### Pre-commit (local)

- Formatage automatique (Prettier, Black, etc.)
- Linting rapide
- Tests unitaires affectés

### Pre-push (local)

- Build complet
- Tous les tests unitaires
- Vérification des types (si applicable)

### CI Pipeline (serveur)

- Build
- Tests unitaires
- Tests d'intégration
- Analyse de couverture (>= 80%)
- Analyse de sécurité
- Linting complet

### Pre-merge (PR)

- Tous les CI checks passent
- Revue de code approuvée
- Pas de conflits
- Branch a jour avec develop

## Governance

### Amendment Process

1. Proposer le changement via une branche `spec/constitution-*`
2. Documenter la raison du changement
3. Obtenir l'approbation des mainteneurs
4. Mettre a jour la version selon semver
5. Propager les changements aux templates dépendants

### Versioning Policy

- **MAJOR**: Changements incompatibles ou suppression de principes
- **MINOR**: Ajout de nouveaux principes ou sections
- **PATCH**: Clarifications, corrections mineures

### Compliance Review

- Revue trimestrielle de la conformité du projet
- Audit des violations et plan d'action
- Mise a jour de la constitution si nécessaire

### Constitution Precedence

Cette constitution SUPPLANTE toutes les autres pratiques. En cas de conflit entre cette constitution et d'autres documents, la constitution prévaut.

**Version**: 1.1.0 | **Ratified**: 2025-11-28 | **Last Amended**: 2025-11-28
