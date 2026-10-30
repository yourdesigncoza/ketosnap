/* The 7-day keto plan, the weekly shop and the house rules. Monday is Day 1, Sunday is Day 7.
   The app reads everything from here; the shared plan page (keto/keto-week.html in thisandthat) mirrors it. */
self.KETO_PLAN = {
  carbs: '20 to 30 g net carbs a day',
  carbLow: 20,
  carbHigh: 30,

  days: [
    {
      name: 'Monday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3 eggs scrambled in 1 tsp butter, a big handful of wilted spinach, ½ avo'],
        ['Lunch', '1 tin tuna in water (drained) with 1 tbsp mayo, lettuce, cucumber and 1 tsp olive oil'],
        ['Dinner', '2 chicken thighs (skin on), 1 cup cauliflower mash with 1 tsp butter, 1 cup green beans'],
      ],
      todo: ['Cook all 4 chicken thighs tonight and keep 2 for Tuesday\'s lunch.'],
    },
    {
      name: 'Tuesday', kind: 'Spin day',
      meals: [
        ['Breakfast', '¾ cup plain double-cream Greek yoghurt, 8 to 10 macadamias, a small handful of berries'],
        ['Lunch', '1 to 2 leftover chicken thighs, side salad, 30 g feta (matchbox size)'],
        ['Dinner', '1 hake fillet (about 150 g) pan-fried in 1 tsp butter, 2 cups baby marrow and broccoli'],
      ],
      todo: [],
    },
    {
      name: 'Wednesday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3-egg omelette with mushrooms and 30 g cheddar'],
        ['Lunch', '1 tin sardines in olive oil (drain most of the oil), tomato and cucumber salad'],
        ['Dinner', 'Mince cottage pie topped with cauli mash and cheese. One portion is about 150 g mince'],
      ],
      todo: ['Make the cottage pie as two portions and keep one for Thursday\'s lunch.'],
    },
    {
      name: 'Thursday', kind: 'Spin day',
      meals: [
        ['Breakfast', '2 boiled eggs, ½ avo, ½ cup cottage cheese'],
        ['Lunch', 'One portion of leftover cottage pie'],
        ['Dinner', '2 lamb chops (trim the fat), 2 roasted cabbage wedges, ½ cup creamed spinach'],
      ],
      todo: ['Tonight, move 1 chicken breast from the freezer to the fridge for Friday\'s lunch.'],
    },
    {
      name: 'Friday', kind: 'Spin day',
      meals: [
        ['Breakfast', '2 or 3 egg muffins with spinach and feta'],
        ['Lunch', '1 chicken breast and ½ avo in lettuce-leaf wraps'],
        ['Dinner', '1 tin sardines in olive oil (drained) with lemon, big salad'],
      ],
      todo: [
        'Bake a batch of 12 egg muffins. The rest keep in the fridge for up to 4 days.',
        'Tonight, move the second chicken breast to the fridge for Saturday\'s dinner.',
      ],
    },
    {
      name: 'Saturday', kind: 'Rest day',
      meals: [
        ['Breakfast', '2 or 3 leftover egg muffins, ½ avo'],
        ['Lunch', 'Big salad with 2 boiled eggs, cucumber, 1 tsp olive oil and 30 g cheddar'],
        ['Dinner', '1 chicken breast stir-fried in 1 tsp olive oil with about 2 cups of cabbage, peppers, mushrooms and baby marrow'],
      ],
      todo: [
        'Season the stir-fry with garlic, ginger and a small splash of soy sauce. Skip bottled stir-fry sauces, which are full of sugar.',
        'Tonight, move the braai meat from the freezer to the fridge.',
      ],
    },
    {
      name: 'Sunday', kind: 'Rest day',
      meals: [
        ['Morning', 'Coffee or rooibos, then a late brunch'],
        ['Braai', '1 steak (about 200 g) or 2 chicken sosaties, half a gem squash with 1 tsp butter, salad'],
        ['Dinner', 'Keep it light: a 2-egg omelette or a small portion of leftovers'],
      ],
      todo: [],
    },
  ],

  // Shown on the Week screen and sent to the model with every meal check.
  guides: [
    { title: 'Use your hand as a guide', items: [
      'Protein: the size of your palm, about 150 to 200 g cooked, or 2 to 3 eggs',
      'Vegetables: half the plate; green veg can be topped up',
      'Butter or oil: the tip of your thumb, about 1 tsp per meal',
      'Cheese: matchbox size, about 30 g',
      'Nuts: one small handful, 8 to 10 macadamias',
    ] },
    { title: 'When you\'re still hungry', items: [
      'Drink a glass of water and wait 15 minutes',
      'Still hungry? Add more green veg or an extra egg',
      'Don\'t top up with nuts, cheese or butter. They\'re easy to overdo',
      'Eat slowly and stop when you\'re satisfied, not full',
    ] },
    { title: 'Snacks if needed (one a day)', items: [
      '8 to 10 macadamias or 15 almonds',
      '30 g cheese (matchbox size)',
      '2 celery sticks with 1 tbsp no-sugar peanut butter',
    ] },
    { title: 'Drinks', items: ['Water, plenty of it', 'Rooibos', 'Coffee with cream instead of milk'] },
    { title: 'Cut out', items: [
      'Bread, pap, rice, potatoes',
      'Butternut and sweet potato',
      'Fruit juice and fizzy drinks',
      'Flavoured yoghurt',
      'Chutney and bottled sauces',
      'Biltong and boerewors (very salty)',
      'Polony (very salty)',
      'Smoked snoek (very salty)',
    ] },
    { title: 'Go easy on', items: ['Added salt at the table', 'Bacon', 'Salty cheeses like feta'] },
    { title: 'The first week', items: [
      'Expect a few tired days and weaker spin sessions while your body adapts. Drink plenty of water. It usually passes within one to two weeks.',
      'If you have high blood pressure or take any medication, check with your doctor or clinic first, and don\'t add extra salt. Get electrolytes from avocado, spinach and mushrooms instead.',
    ] },
  ],

  shopNote: 'One shop covers the week. Freeze the chicken breasts and braai meat on shopping day. If the mince use-by date is before Wednesday, freeze it too. Pantry items last several weeks.',

  // [item, quantity]; an empty quantity means buy per bottle or jar.
  shop: [
    { title: 'Meat and fish', items: [
      ['Chicken thighs, skin on', '4'],
      ['Chicken breasts', '1 pack (you need 2), freeze'],
      ['Beef mince', '300 to 500 g (closest pack size)'],
      ['Lamb chops', '2'],
      ['Steak or chicken sosaties', '1 steak (about 200 g) or 2 sosaties, freeze'],
      ['Hake fillet', '1 (about 150 g)'],
      ['Tuna in water', '1 tin'],
      ['Sardines in olive oil', '2 tins'],
    ] },
    { title: 'Eggs and dairy', items: [
      ['Eggs', '1 tray of 30'],
      ['Butter', '1 block (250 g)'],
      ['Plain double-cream Greek yoghurt', '1 small tub (about 175 g)'],
      ['Cheddar', '1 block (250 g)'],
      ['Feta', '1 tub (about 200 g)'],
      ['Cottage cheese', '1 small tub (250 g)'],
      ['Fresh cream', '250 ml'],
    ] },
    { title: 'Vegetables and fruit', items: [
      ['Baby spinach', '2 bags (about 400 g)'],
      ['Avocados', '3'],
      ['Cauliflower', '1 large head'],
      ['Green beans', '1 small pack (about 200 g)'],
      ['Broccoli', '1 head'],
      ['Baby marrow', '1 pack (about 500 g)'],
      ['Mushrooms', '1 punnet (250 g)'],
      ['Cabbage', '1 small head'],
      ['Peppers', '2'],
      ['Lettuce', '2 heads'],
      ['Cucumber', '2'],
      ['Tomatoes', '1 small punnet'],
      ['Celery', '1 small bunch'],
      ['Gem squash', '1'],
      ['Lemons', '2'],
      ['Garlic', '1 bulb'],
      ['Fresh ginger', '1 small piece'],
      ['Berries', '1 small punnet (125 g)'],
    ] },
    { title: 'Pantry', items: [
      ['Olive oil', ''],
      ['Mayonnaise', ''],
      ['Soy sauce', ''],
      ['Macadamias or almonds', '1 small bag (about 100 g) a week'],
      ['No-sugar peanut butter', ''],
      ['Rooibos tea', ''],
    ] },
  ],
};
