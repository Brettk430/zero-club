-- Restore progress that the earlier repair had to discard.
--
-- repair_starting_debt.sql could only set starting_debt = current_debt for rows
-- that had lost their starting figure, which zeroed out the progress those
-- members had genuinely made. Their payment history survived, so the starting
-- figure can be reconstructed from it rather than guessed at:
--
--     starting = what you owe now + everything you have logged
--
-- Only touches rows that show no progress but have payments behind them, so it
-- is safe to run more than once and leaves correct rows alone.
update public.profiles p
   set starting_debt = p.current_debt + paid.total
  from (
    select user_id, sum(amount) as total
    from public.payments
    group by user_id
  ) paid
 where paid.user_id = p.id
   and paid.total > 0
   and p.starting_debt <= p.current_debt;
