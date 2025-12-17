-- Add subject column to push_content table
ALTER TABLE public.push_content 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Update existing rows to have a default subject if needed
UPDATE public.push_content
SET subject = CONCAT('BiteChina Newsletter - ', TO_CHAR(date, 'Month DD, YYYY'))
WHERE subject IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.push_content.subject IS 'Email subject line for the push content';