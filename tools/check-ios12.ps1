# Vérifie que JeFIT reste compatible avec un vieil iPad (iOS 12 / Safari 12) ET les appareils récents.
# À lancer avant chaque mise en ligne :  powershell -ExecutionPolicy Bypass -File tools\check-ios12.ps1
# Une seule syntaxe inconnue de Safari 12 bloque TOUT le script : la page reste vide sur l'iPad.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$files = @(Join-Path $root 'index.html')
$jr = Join-Path (Split-Path $root -Parent) 'Jeride\index.html'
if (Test-Path $jr) { $files += $jr }

# [motif, explication, bloquant ?]
$rules = @(
  @('\?\?',                         'opérateur ?? (iOS 13.4+) : utiliser nz(a,b)', $true),
  @('\?\.[A-Za-z_$\[(]',            'chaînage ?. (iOS 13.4+) : utiliser a&&a.b', $true),
  @('(\|\||&&|\?\?)=',              'affectation logique ||= &&= (iOS 14+)', $true),
  @('\(\?<[=!]',                    'regex lookbehind (iOS 16.4+)', $true),
  @('\d_\d{3}',                     'séparateur numérique 1_000 (iOS 13+)', $false),
  @('\bthis\.#|\bstatic\s*\{',      'champs privés / blocs static de classe (iOS 14.5+)', $true),
  @('\.replaceAll\(',               'String.replaceAll (iOS 13.4+)', $true),
  @('\.at\(-?\w',                   'Array/String.at (iOS 15.4+)', $true),
  @('\.matchAll\(',                 'String.matchAll (iOS 13+)', $true),
  @('Promise\.(allSettled|any)\b',  'Promise.allSettled/any (iOS 13+/14+)', $true),
  @('structuredClone\(',            'structuredClone (iOS 15.4+)', $true),
  @('randomUUID',                   'crypto.randomUUID (iOS 15.4+)', $true),
  @('Object\.hasOwn\(',             'Object.hasOwn (iOS 15.4+)', $true),
  @('\.(findLast|toSorted|toReversed)\(', 'méthodes de tableau récentes (iOS 15.4+/16+)', $true),
  @('matchMedia\([^)]*\)\.addEventListener', 'matchMedia().addEventListener (iOS 14+) : utiliser addListener', $true),
  @('(?<=[;{\s"])inset:',           'CSS inset: (iOS 14.5+) : utiliser top/right/bottom/left', $true),
  @('clamp\(',                      'CSS clamp() (iOS 13.4+) : utiliser max(a,min(b,c))', $true),
  @('aspect-ratio',                 'CSS aspect-ratio (iOS 15+) : prévoir une hauteur de secours', $false),
  @('color-mix\(',                  'CSS color-mix() (iOS 16.2+) : purement décoratif, sinon prévoir une couleur de secours', $false),
  @('\d(dvh|svh|lvh)\b',            'unités dvh/svh (iOS 15.4+)', $true),
  @(':(is|where|has)\(',            'sélecteurs :is/:where/:has (iOS 14+/15.4+)', $true)
)
$bad = 0
foreach ($f in $files) {
  $lines = [IO.File]::ReadAllLines($f, [Text.Encoding]::UTF8)
  foreach ($r in $rules) {
    for ($i = 0; $i -lt $lines.Count; $i++) {
      $l = $lines[$i]
      if ($l.Length -gt 5000 -and $l -match '^[A-Za-z0-9+/=]{200,}') { continue } # données base64
      foreach ($m in [regex]::Matches($l, $r[0])) {
        $s = [Math]::Max(0, $m.Index - 40)
        $tag = if ($r[2]) { 'BLOQUANT' } else { 'à vérifier' }
        if ($r[2]) { $bad++ }
        "{0} {1}:{2}  {3}`n    ...{4}..." -f $tag, (Split-Path $f -Leaf), ($i + 1), $r[1], $l.Substring($s, [Math]::Min(100, $l.Length - $s))
      }
    }
  }
}
if ($bad) { "`n$bad problème(s) bloquant(s) pour iOS 12."; exit 1 } else { "OK : rien de bloquant pour iOS 12." }
