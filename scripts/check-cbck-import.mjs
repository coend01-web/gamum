// Local disposable PostgreSQL only. Never connects to hosted Supabase.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createDatabase,rpc} from '../tests/ops-db-support.mjs';
const db=await createDatabase();
try{
 const summary=JSON.parse(await readFile('private/cbck/review_summary.json','utf8'));
 const sql=await readFile('private/cbck/cbck_staging_review_ONLY.sql','utf8');
 await db.exec(sql);await db.exec(sql);
 const data=await rpc(db,'operator','ops_directory_search');
 assert.equal(data.counts.unique_records,summary.unique_directory_records);
 assert.equal(data.counts.source_rows,summary.classification_rows);
 assert.equal(data.counts.organizations,summary.institution_candidates);
 assert.equal(data.counts.facilities,summary.facility_candidates);
 const [counts]=(await db.query("select (select count(*) from organizations) organizations,(select count(*) from retreat_houses) houses,(select count(*) from organization_credentials) credentials,(select count(*) from camum_private.cbck_directory_staging where affiliation_state='source_matched') source_links")).rows;
 assert.equal(counts.organizations,0);assert.equal(counts.houses,0);assert.equal(counts.credentials,0);
 assert.equal(counts.source_links,summary.facility_source_links);
 const newOrg=await rpc(db,'operator','ops_create_organization',{p_name:'가상 예약 충돌 검사',p_url:'https://example.org'});
 const number=(await db.query('select management_number from organizations where id=$1',[newOrg])).rows[0].management_number;
 assert(!(await db.query('select 1 from camum_private.cbck_directory_staging where provisional_management_number=$1',[number])).rows.length);
 for(const user of [null,'owner','other'])await assert.rejects(()=>rpc(db,user,'ops_directory_search'));
 const head=(await db.query('select source_record_id,version from camum_private.cbck_directory_staging where provisional_management_number is not null and canonical_source_record_id is null limit 1')).rows[0];
 await rpc(db,'operator','ops_directory_review',{p_id:head.source_record_id,p_version:head.version,p_decision:'verify',p_target:null,p_note:'가상 검수 유지 테스트: 실제 기관 승인 아님',p_evidence:'https://example.org'});
 await db.exec(sql);
 assert.equal((await rpc(db,'operator','ops_directory_detail',{p_id:head.source_record_id})).record.review_state,'verified');
 const result={environment:'LOCAL PGlite with mocked Auth; NOT hosted Supabase',importedRepeatedlyWithoutDuplicates:true,humanReviewPreserved:true,...data.counts,sourceLinks:counts.source_links,nextNumber:number,liveOrganizationsBeforeTest:0,liveCredentials:0,hostedDatabaseVerified:false};
 await writeFile('private/cbck/import_verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
