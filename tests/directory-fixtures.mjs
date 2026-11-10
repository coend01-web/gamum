// Invented records only. Never deploy these fixtures or use them as real CBCK information.
export async function seedDirectory(db){
 await db.exec(`insert into camum_private.cbck_directory_staging(source_record_id,cbck_code,source_section,official_name,official_detail_url,source_checked_on,provisional_management_number,provisional_facility_number) values
 ('male_head:990000001','990000001','male_head','가상 검수 A 수도회','https://example.org/a',current_date,'CAM-000003',null),
 ('male_all:990000001','990000001','male_all','가상 검수 A 수도회','https://example.org/a',current_date,null,null),
 ('female_head:990000002','990000002','female_head','가상 검수 B 수녀회','https://example.org/b',current_date,'CAM-000004',null),
 ('retreat_house:990000003','990000003','retreat_house','가상 사전등록 피정의 집','https://example.org/house',current_date,null,'CAM-H-000001'),
 ('retreat_house:990000004','990000004','retreat_house','가상 미확인 시설','https://example.org/unknown',current_date,null,'CAM-H-000002');
 update camum_private.cbck_directory_staging set canonical_source_record_id='male_head:990000001',review_state='duplicate_review' where source_record_id='male_all:990000001';
 update camum_private.cbck_directory_staging set parent_source_record_id='male_head:990000001',affiliation_state='source_matched',review_state='affiliation_review',operator_name='가상 검수 A 수도회' where source_record_id='retreat_house:990000003';`);
 await db.query("select ops_auth_directory_request('990000001','가상 기관 연락처 example.test')");
}
