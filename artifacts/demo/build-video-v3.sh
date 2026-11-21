#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

BUILD="build-v3"
OUT="../../docs/demo"
mkdir -p "$BUILD" "$OUT"

# in-points chosen from the real recordings after page load completed
encode () {
  local input="$1" start="$2" duration="$3" output="$4" extra="${5:-}"
  local vf="scale=1920:1080:flags=lanczos,setsar=1,fps=30"
  if [[ -n "$extra" ]]; then vf="$extra,setsar=1,fps=30"; fi
  ffmpeg -hide_banner -loglevel error -y -ss "$start" -i "$input" -t "$duration" \
    -vf "$vf" -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart "$output"
}

encode raw-v3/s01-dashboard.webm     5.2  15.320  "$BUILD/01.mp4"
encode raw-v3/s02-workspace.webm     5.2  14.798  "$BUILD/02.mp4"
encode raw-v3/s03-approved-run.webm  5.2  25.128  "$BUILD/03.mp4"
encode raw-v3/s04-privacy.webm       5.5  17.217  "$BUILD/04.mp4"
encode raw-v3/s05-payment-flow.webm  7.5  34.880  "$BUILD/05.mp4"
encode raw-v3/s06-explorer.webm      9.0  15.997  "$BUILD/06.mp4" "crop=1450:816:250:80,scale=1920:1080:flags=lanczos"
encode raw-v3/s07-evidence.webm     12.0  22.044  "$BUILD/07.mp4"
encode raw-v3/s08-payment-audit.webm 9.0  18.342  "$BUILD/08.mp4"
encode raw-v3/s09-closing.mp4        0.0  13.820  "$BUILD/09.mp4"

cat > "$BUILD/video-list.txt" <<'EOF'
file '01.mp4'
file '02.mp4'
file '03.mp4'
file '04.mp4'
file '05.mp4'
file '06.mp4'
file '07.mp4'
file '08.mp4'
file '09.mp4'
EOF

ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$BUILD/video-list.txt" -c copy "$BUILD/silent.mp4"

cp captions-v3.srt "$OUT/assay-demo-captions.srt"

ffmpeg -hide_banner -loglevel error -y -i "$BUILD/silent.mp4" -i audio-v3/narration.wav \
  -vf "subtitles=captions-v3.srt:original_size=1920x1080:force_style='FontName=DejaVu Sans,FontSize=7,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H99151515,BorderStyle=3,Outline=1,Shadow=0,MarginV=30'" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 19 -r 30 \
  -c:a aac -b:a 192k -ar 48000 \
  -t 177.546 -movflags +faststart \
  "$OUT/assay-demo-final.mp4"

ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate -of default=nw=1 "$OUT/assay-demo-final.mp4"
