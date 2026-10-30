-- Domingo de dobles: un modo nuevo en los resultados del día.
alter table public.results drop constraint results_mode_check;
alter table public.results add constraint results_mode_check
  check (mode in ('blue', 'red', 'lance', 'steven', 'wallace', 'cynthia', 'iris', 'leon', 'liga', 'dobles'));
