"""Run with Pillow and imageio-ffmpeg installed; retain original source media."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.media-tools'))
from PIL import Image
import imageio_ffmpeg

mapping = {}
before = after = 0
for source in (ROOT / 'images').rglob('*.png'):
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=82, method=6)
    mapping[source.relative_to(ROOT).as_posix()] = target.relative_to(ROOT).as_posix()
    before += source.stat().st_size
    after += target.stat().st_size
print(f'Images: {before:,} -> {after:,} bytes', flush=True)

video = ROOT / 'images/ourwork/Photo&VideoGraphy/VTOP_Velesta_walkthrough.MOV.mp4'
output = video.with_name('velesta-web.mp4')
poster = video.with_name('velesta-poster.webp')
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ffmpeg, '-y', '-i', str(video), '-vf',
    'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', str(output)], check=True)
subprocess.run([ffmpeg, '-y', '-ss', '2', '-i', str(output), '-frames:v', '1',
    str(poster)], check=True)
print(f'Video: {video.stat().st_size:,} -> {output.stat().st_size:,} bytes', flush=True)
mapping[video.relative_to(ROOT).as_posix().replace('&', '%26')] = output.relative_to(ROOT).as_posix().replace('&', '%26')
for page in [*ROOT.glob('*.html'), *(ROOT / 'css').glob('*.css'), *(ROOT / 'js').glob('*.js')]:
    text = page.read_text(encoding='utf-8')
    for old, new in mapping.items():
        text = text.replace(old, new).replace(old.replace(' ', '%20'), new.replace(' ', '%20'))
    if page.name == 'work.html':
        text = text.replace('preload="metadata"', 'preload="none" poster="images/ourwork/Photo%26VideoGraphy/velesta-poster.webp"')
    page.write_text(text, encoding='utf-8')
