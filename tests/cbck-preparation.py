import contextlib, importlib.util, io, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('prepare',Path(__file__).resolve().parents[1]/'scripts/prepare_cbck_catalog.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class ReservationTest(unittest.TestCase):
    def test_removed_highest_number_never_reused(self):
        with tempfile.TemporaryDirectory() as tmp:
            p.OUT=Path(tmp); names=['A','B'];house_names=['H1','H2']
            def collect(kind,*args):
                selected=names if kind.endswith('_head') else house_names if kind=='retreat_house' else []
                rows=[dict(record_id=kind+':'+n,source_type=kind,cbck_code=n,name=n,context='',source_url='https://example.org',checked_on='2026-11-09') for n in selected]
                return rows,len(rows)
            p.collect=collect
            with contextlib.redirect_stdout(io.StringIO()):p.main()
            original=p.previous(p.OUT/'organizations_pending.csv','management_number');old_house=p.previous(p.OUT/'retreat_houses_pending.csv','facility_number')
            names[:]=['A'];house_names[:]=['H1']
            with contextlib.redirect_stdout(io.StringIO()):p.main()
            names[:]=['A','C'];house_names[:]=['H1','H3']
            with contextlib.redirect_stdout(io.StringIO()):p.main()
            current=p.previous(p.OUT/'organizations_pending.csv','management_number');new_house=p.previous(p.OUT/'retreat_houses_pending.csv','facility_number')
            self.assertEqual(current['male_head:A'],original['male_head:A'])
            self.assertTrue(all(v not in original.values() for k,v in current.items() if k.endswith(':C')))
            self.assertNotIn(new_house['retreat_house:H3'],old_house.values())
            ledger=json.loads((p.OUT/'code_reservations.json').read_text())
            self.assertEqual(ledger['organizations']['male_head:B'],original['male_head:B'])
if __name__=='__main__':unittest.main()
