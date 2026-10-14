import os
HERE=os.path.dirname(os.path.abspath(__file__))
SP=os.path.join(HERE,'src','parts')+os.sep
order=['01b_post_lib.js','02_setup.js','02b_sky.js','02c_facade.js','03a_net_data.js','03b_bld_data.js','03c_poi_data.js','03d_terrain_data.js','03_world_data.js','04_graph.js','04b_streets.js','04c_budget.js','05a_roads.js','05b_decor.js','06a_fabric.js','06b_landmarks.js','06c_campus.js','06e_markers.js','06f_pois.js','06g_pack.js','06g2_lm.js','06h2_final_patch.js','06h_gen.js','06d_fabric_driver.js','06i_infra.js','06j_veg.js','06k_csv_places.js','06l_real_pois.js','07a0_mat.js','07a_cars.js','07a2_traffic.js','07a4_carvis.js','07a3_showcars.js','07p_player.js','07b_tune.js','08a_wheel.js','08b_heist.js','08c_shop.js','09_ai.js','10_laws_player.js','10b_ios_touch.js','10c_wheel.js','11_race.js','11b_nav.js','12a_fx.js','12b_post.js','12c_terrain.js','12_hud_loop.js']
head=open(SP+'01_head.html').read()
body=''.join(open(SP+f).read().rstrip('\n')+'\n' for f in order)
out=head+body+'</script></body></html>\n'
os.makedirs(os.path.join(HERE,'dist'),exist_ok=True)
open(os.path.join(HERE,'dist','irbid-drive.html'),'w').write(out)
print(len(out),'chars',out.count('\n'),'lines')
