-- Part 9: richer quotes — notes, validity, per-line descriptions
alter table quotes add column if not exists notes text;
alter table quotes add column if not exists valid_days int not null default 30;
alter table quote_items add column if not exists long_desc text;
