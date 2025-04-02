$compress = @{
  Path = "images", "popup", "scripts", "manifest.json", "*.html", "*.js", "css"
  CompressionLevel = "Fastest"
  DestinationPath = "publish\edge\dko3extension.zip"
  Force = $True
}
Compress-Archive @compress