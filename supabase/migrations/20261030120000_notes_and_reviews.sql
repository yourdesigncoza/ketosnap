-- The meals table also carries the day notes (slot 'note', one per day) and the weekly reviews (slot 'review',
-- dated the week's Monday, status 'draft' or 'done'), so they store and sync with the same code as meals.
alter table public.meals drop constraint meals_slot_check;
alter table public.meals add constraint meals_slot_check check (slot in ('0', '1', '2', 'extra', 'note', 'review'));
