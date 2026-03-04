-- Migration: Add auditoria column to estados table
-- This migration adds the auditoria column to support displaying "Auditoría" mode on displays

ALTER TABLE estados ADD COLUMN IF NOT EXISTS auditoria BOOLEAN DEFAULT 0;

-- Update existing rows to have auditoria = 0
UPDATE estados SET auditoria = 0 WHERE auditoria IS NULL;
