-- AlterTable
ALTER TABLE `document` MODIFY `type` ENUM('STNK', 'Insurance', 'KTP', 'SIM', 'BPKB') NOT NULL;
