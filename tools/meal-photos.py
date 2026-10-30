"""Meal photos for the dish cards, all in one style, made with an image model through OpenRouter.

  set -a; . ./.env; set +a
  python3 -I tools/meal-photos.py make <out-dir> <id> [<id> ...]   # one new candidate per id: <out-dir>/<id>-<n>.png
  python3 -I tools/meal-photos.py save <id>=<candidate.png> [...]  # square, 960 px JPEG into img/meals/<id>.jpg

The ids are the photo names in plan.js. Look at every candidate before saving: nothing red that reads as chilli,
no bread. Each candidate costs about US$0.07."""
import base64, json, os, sys, urllib.request
from PIL import Image

MODEL = 'google/gemini-3.1-flash-image'
MEALS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img', 'meals')
STYLE = ('Realistic home-cooked food photograph, taken from about 45 degrees above, soft natural window daylight, '
         'on a plain light stone-grey kitchen table, simple white ceramic plate or bowl. The food is centred with a '
         'little space around it so the picture can be cropped square. Appetising and honest, like a good phone photo '
         'of a real dinner at home, not a restaurant. No people, no hands, no text, no logos, no bread, no toast.')
NO_RED = 'Seasoned with a little black pepper only. No red flakes or red spice anywhere.'

DISHES = {
    'eggs-scrambled': 'Soft scrambled eggs (3 eggs) folded through wilted spinach, with half an avocado sliced into a fan beside them.',
    'eggs-boiled': 'Three peeled hard-boiled eggs cut in half lengthwise, firm yellow yolks, with half an avocado sliced, a lemon wedge and a little cracked black pepper.',
    'eggs-fried': f'Two sunny-side-up fried eggs with a small pile of wilted spinach and half an avocado. {NO_RED}',
    'omelette': 'A folded golden three-egg omelette with spinach and melted cheese showing at the fold.',
    'tuna-cabbage': 'Tuna mayo: flaked tinned tuna lightly mixed with a spoon of mayonnaise, on a generous bed of finely shredded raw green cabbage, with a lemon wedge. Nothing else in the bowl.',
    'chicken-slaw': 'Two roasted chicken thighs with crispy golden skin, next to a fresh slaw of finely shredded raw green cabbage glossy with olive oil and lemon. Plain cabbage only in the slaw.',
    'mince-pot': 'A deep bowl of home-made beef mince stewed with soft shredded green cabbage and onion: a brown, savoury, chunky stew, mildly seasoned, steam rising. Nothing red in it or on top: no peppers, no chilli flakes, no tomato.',
    'chicken-broccoli': f'Two air-fried chicken thighs with crispy golden-brown skin and a few green dried herbs, next to bright green steamed broccoli florets with a little melting butter. {NO_RED}',
    'hake-broccoli': 'Two fillets of white hake fish, lightly golden on top, white flaky flesh, a pat of butter melting on them and lemon wedges, next to steamed broccoli florets.',
    'braai-chicken': 'Chicken thighs grilling on a South African braai grid over glowing charcoal outdoors, golden and lightly charred. Shot close, from slightly above.',
}


def make(out_dir, dish):
    body = {'model': MODEL, 'messages': [{'role': 'user', 'content': f'{DISHES[dish]} {STYLE}'}],
            'modalities': ['image', 'text'], 'image_config': {'aspect_ratio': '1:1'}, 'usage': {'include': True}}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer ' + os.environ['openrouter_key'],
                                          'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as res:
        data = json.load(res)
    images = data['choices'][0]['message'].get('images') or []
    if not images:
        sys.exit(f'{dish}: the model sent no image')
    n = len([f for f in os.listdir(out_dir) if f.startswith(dish + '-')]) + 1
    path = os.path.join(out_dir, f'{dish}-{n}.png')
    with open(path, 'wb') as f:
        f.write(base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1]))
    print(path, 'cost', data.get('usage', {}).get('cost'))


def save(dish, source):
    im = Image.open(source).convert('RGB')
    side = min(im.size)
    im = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width + side) // 2, (im.height + side) // 2))
    im = im.resize((960, 960), Image.LANCZOS)
    dest = os.path.join(MEALS, dish + '.jpg')
    for quality in (72, 66, 60):
        im.save(dest, 'JPEG', quality=quality, progressive=True, optimize=True)
        if os.path.getsize(dest) < 160_000:
            break
    print(dest, os.path.getsize(dest) // 1024, 'KB')


if __name__ == '__main__':
    cmd, *args = sys.argv[1:] or ['help']
    if cmd == 'make':
        out_dir, *dishes = args
        os.makedirs(out_dir, exist_ok=True)
        for d in dishes:
            make(out_dir, d)
    elif cmd == 'save':
        for pair in args:
            save(*pair.split('=', 1))
    else:
        sys.exit(__doc__)
