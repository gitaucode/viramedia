INSERT INTO leads (id,status,name,company,email,phone,service,budget,brief,notes)
VALUES (1,'qualified','UI Test Lead','Consistency Labs','ui-lead@example.com','+254700000010','Creator campaign','100000','Visual QA test lead','Disposable UI test data');

INSERT INTO campaign_clients (campaign_id,client_id,role)
VALUES (1,1,'primary');
UPDATE campaigns SET primary_client_id=1 WHERE id=1;

INSERT INTO campaign_creators (campaign_id,creator_id,status,created_at,updated_at,accepted_at)
VALUES (1,1,'assigned',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO deliverables (
  id,campaign_id,creator_id,title,due_date,status,notes,instructions,creator_fee,payment_status,client_approval_status
) VALUES (
  1,1,1,'UI Consistency Deliverable',date('now','+5 day'),'submitted','Disposable UI test deliverable','Create a short-form test video',25000,'pending','not_ready'
);
