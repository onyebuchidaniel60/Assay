#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
mkdir -p build

ffmpeg -y -loop 1 -i ../../apps/web/public/brand/assay-logo.png -f lavfi -i "color=c=0x111111:s=1920x1080:d=2.5:r=30" \
  -filter_complex "[0:v]scale=220:220[logo];[1:v][logo]overlay=(W-w)/2:170,drawtext=fontfile=${FONT}:text='ASSAY':fontcolor=0xD7FF3F:fontsize=100:x=(w-text_w)/2:y=430,drawtext=fontfile=${FONT}:text='Synthetic covenant operations · product demo':fontcolor=0xF3F0E8:fontsize=32:x=(w-text_w)/2:y=548,drawtext=fontfile=${FONT}:text='No real borrower data':fontcolor=0x8E8E86:fontsize=24:x=(w-text_w)/2:y=604" \
  -t 2.5 -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p build/00-title.mp4

render_scene () {
  local input="$1" start="$2" target="$3" output="$4"
  ffmpeg -y -ss "$start" -i "$input" -t "$target" \
    -vf "scale=1728:1080:flags=lanczos,pad=1920:1080:96:0:color=0x111111,fps=30,tpad=stop_mode=clone:stop_duration=20" \
    -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$output"
}

render_scene raw/01-dashboard.webm 3.8 17.0 build/01-dashboard.mp4
render_scene raw/02-facility.webm 0.8 13.0 build/02-facility.mp4
render_scene raw/03-analysis.webm 5.8 34.0 build/03-analysis.mp4
render_scene raw/04-approval.webm 2.8 18.5 build/04-approval.mp4
render_scene raw/05-evaluations.webm 2.5 22.0 build/05-evaluations.mp4
render_scene raw/06-audit.webm 5.8 12.0 build/06-audit.mp4
render_scene raw/07-integrations.webm 1.8 13.0 build/07-integrations.mp4

cat > build/video-list.txt <<'EOF'
file '00-title.mp4'
file '01-dashboard.mp4'
file '02-facility.mp4'
file '03-analysis.mp4'
file '04-approval.mp4'
file '05-evaluations.mp4'
file '06-audit.mp4'
file '07-integrations.mp4'
EOF
ffmpeg -y -f concat -safe 0 -i build/video-list.txt -c copy build/silent.mp4

ffmpeg -y -f lavfi -i "anullsrc=r=22050:cl=mono:d=2.5" -c:a pcm_s16le build/silence-title.wav
ffmpeg -y -f lavfi -i "anullsrc=r=22050:cl=mono:d=0.35" -c:a pcm_s16le build/silence-gap.wav
cat > build/audio-list.txt <<'EOF'
file 'silence-title.wav'
file '../audio/scene1.wav'
file 'silence-gap.wav'
file '../audio/scene2.wav'
file 'silence-gap.wav'
file '../audio/scene3.wav'
file 'silence-gap.wav'
file '../audio/scene4.wav'
file 'silence-gap.wav'
file '../audio/scene5.wav'
file 'silence-gap.wav'
file '../audio/scene6.wav'
file 'silence-gap.wav'
file '../audio/scene7.wav'
EOF
ffmpeg -y -f concat -safe 0 -i build/audio-list.txt -c copy build/narration.wav

ffmpeg -y -i build/silent.mp4 -i build/narration.wav \
  -vf "subtitles=captions-final.srt:original_size=1920x1080:force_style='FontName=DejaVu Sans,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H90000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=34'" \
  -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 160k -t 132.0 -movflags +faststart \
  assay-demo-final.mp4

ffprobe -v error -show_entries format=duration,size -of default=nw=1 assay-demo-final.mp4
