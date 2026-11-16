# Copie JeRIDE (..\Jeride\index.html) à l'intérieur de JeFIT (index.html), entre les balises jeride-src.
# À relancer après chaque modification de JeRIDE :  powershell -ExecutionPolicy Bypass -File tools\embed-jeride.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$jf = Join-Path $root 'index.html'
$jr = Join-Path (Split-Path $root -Parent) 'Jeride\index.html'
$utf8 = New-Object Text.UTF8Encoding $false
$src = [IO.File]::ReadAllText($jr, [Text.Encoding]::UTF8)
foreach ($t in '<@JRc@', '<@JRs@', '<@JRe@') { if ($src.Contains($t)) { throw "Le jeton $t existe déjà dans JeRIDE" } }
# Neutralise ce qui fermerait ou perturberait la balise <script type="text/plain"> (restauré au chargement)
$esc = $src.Replace('<!--', '<@JRc@!--').Replace('</script', '<@JRe@/script').Replace('<script', '<@JRs@script')
$open = '<script type="text/plain" id="jeride-src">'
$close = '</script><!--/jeride-src-->'
$html = [IO.File]::ReadAllText($jf, [Text.Encoding]::UTF8)
$i = $html.IndexOf($open)
if ($i -ge 0) {
  $j = $html.IndexOf($close, $i)
  $html = $html.Substring(0, $i) + $open + $esc + $close + $html.Substring($j + $close.Length)
} else {
  $k = $html.LastIndexOf('</body>')
  $html = $html.Substring(0, $k) + $open + $esc + $close + "`n" + $html.Substring($k)
}
[IO.File]::WriteAllText($jf, $html, $utf8)
"JeRIDE intégré : {0} Ko -> JeFIT {1} Ko" -f [math]::Round($src.Length / 1KB), [math]::Round($html.Length / 1KB)
