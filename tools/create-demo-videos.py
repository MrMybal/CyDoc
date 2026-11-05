"""Optional asset authoring tool; requires imageio-ffmpeg. Not used by CyDoc builds."""
from pathlib import Path
import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for name, codec, extra, hue in [
    ('video-a.webm', 'libvpx-vp9', ['-crf', '36', '-b:v', '0'], '0'),
    ('video-b.webm', 'libvpx-vp9', ['-crf', '36', '-b:v', '0'], '60'),
    ('video-av1.webm', 'libaom-av1', ['-cpu-used', '8', '-crf', '40', '-b:v', '0'], '0'),
]:
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
                    'testsrc2=size=480x270:rate=24:duration=5', '-vf', f'hue=h={hue}',
                    '-c:v', codec, *extra, '-an', str(Path('assets') / name)], check=True)
