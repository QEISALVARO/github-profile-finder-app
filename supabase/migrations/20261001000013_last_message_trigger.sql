-- supabase/migrations/20261001000013_last_message_trigger.sql
-- Trigger: update conversations.last_message_at setelah insert ke messages

create or replace function public.update_last_message_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_last_message_at
  after insert on public.messages
  for each row execute function public.update_last_message_at();
