# JeFIT : règles du projet

## Compatibilité obligatoire : vieil iPad (iOS 12) + appareils récents
L'app est utilisée sur un iPad mini 2 bloqué en **iOS 12.5.8 (Safari 12)** et sur des appareils récents. Toute modification doit marcher sur les deux.

- Une seule syntaxe JavaScript inconnue de Safari 12 bloque tout le script, et la page reste vide sans message. Interdits notamment : `??` (utiliser `nz(a,b)`), `?.` (utiliser `a&&a.b`), `||=`, `&&=`, `.at()`, `replaceAll`, `structuredClone`, regex lookbehind.
- CSS : pas de `inset:` (mettre top/right/bottom/left), pas de `clamp()` (mettre `max(a,min(b,c))`), `position:-webkit-sticky` avant `sticky`, une couleur `rgba()` de secours avant tout `color-mix()`.
- `gap` dans les flexbox ne marche pas sur iOS 12. Un correctif JS (`fgFix`, en tête du `<body>`) le remplace par des marges. Ne pas le retirer.
- Les API récentes (clipboard, wakeLock, canShare…) doivent toujours être testées avant usage et entourées de try/catch.
- Animations : légères, déclenchées ponctuellement (pas d'animation en continu), coupées si `prefers-reduced-motion`.

**Avant chaque mise en ligne :** `powershell -ExecutionPolicy Bypass -File tools\check-ios12.ps1` doit afficher « OK ».

## JeRIDE
JeRIDE (`..\Jeride\index.html`) est intégré dans `index.html` par `tools\embed-jeride.ps1`. Une modification de JeRIDE se fait dans sa source, puis on relance l'intégration.
