-- EJECUTAR DESPUÉS de backend/setup.sql y DESPUÉS de crear los dos usuarios en Authentication > Users.
-- Reemplaza los correos de ejemplo; no publiques contraseñas ni claves secretas.
begin;
insert into public.app_access(user_id,role)
select id,'owner' from auth.users where lower(email)=lower('aldolizares@gmail.com')
on conflict(user_id) do update set role='owner';
insert into public.app_access(user_id,role)
select id,'irlanda' from auth.users where lower(email)=lower('irlanda.ascencio@gmail.com')
on conflict(user_id) do update set role='irlanda';
commit;
-- Debe devolver exactamente dos filas con roles owner e irlanda.
select a.role, u.email from public.app_access a join auth.users u on u.id=a.user_id order by a.role;
