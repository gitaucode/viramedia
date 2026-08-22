DELETE FROM activity_events;
DELETE FROM admin_sessions;
DELETE FROM admin_login_attempts;
DELETE FROM performance_metrics;
DELETE FROM campaign_clients;
DELETE FROM client_sessions;
DELETE FROM client_login_codes;
DELETE FROM clients;
DELETE FROM creator_notification_log;
DELETE FROM creator_sessions;
DELETE FROM creator_login_codes;
DELETE FROM submission_versions;
DELETE FROM deliverables;
DELETE FROM campaign_creators;
DELETE FROM campaigns;
DELETE FROM creators;
DELETE FROM leads;

INSERT INTO creators (
  id,status,full_name,email,phone,city,tiktok,niches,formats,notes
) VALUES (
  1,'approved','Test Creator','creator-test@example.com','+254700000001','Nairobi','@testcreator','["lifestyle"]','["short_form"]','Automated test creator'
);

INSERT INTO creator_sessions (token_hash,creator_id,expires_at)
VALUES ('65420df3222a6de70179398a439648f6dabe792fb8f5093bb2539952aa13ce8c',1,'2099-01-01 00:00:00');

INSERT INTO clients (
  id,status,company,contact_name,email,phone
) VALUES
  (1,'active','Test Client Ltd','Test Contact','client-test@example.com','+254700000002'),
  (2,'active','Second Client Ltd','Second Contact','client-two@example.com','+254700000003');

INSERT INTO campaigns (
  id,name,client,objective,creator_brief,budget,status,start_date,end_date,notes
) VALUES (
  1,'Automated Test Campaign','Test Client','Validate the foundation workflow','Create a test short-form video','100000','planning','2026-08-22','2026-09-22','Disposable automated test data'
);
