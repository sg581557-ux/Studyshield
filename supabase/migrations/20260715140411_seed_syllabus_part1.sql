/*
# Seed syllabus subjects and chapters — Part 1 (JEE + NEET + Engineering)

Inserts all subjects and chapters for JEE Main, JEE Advanced, NEET, BITSAT, WBJEE, MHT CET, COMEDK, VITEEE, SRMJEEE, KIITEE, AIIMS.

Uses helper functions to reduce repetition.
*/

CREATE OR REPLACE FUNCTION _seed_subject(p_exam_id text, p_name text, p_order int)
RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO syllabus_subjects (exam_id, name, display_order)
  VALUES (p_exam_id, p_name, p_order)
  ON CONFLICT (exam_id, name) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM syllabus_subjects WHERE exam_id = p_exam_id AND name = p_name;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _seed_chapter(p_subject_id uuid, p_name text, p_order int)
RETURNS void AS $$
BEGIN
  INSERT INTO syllabus_chapters (subject_id, name, display_order)
  VALUES (p_subject_id, p_name, p_order)
  ON CONFLICT (subject_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Helper: copy all chapters from one subject to another
CREATE OR REPLACE FUNCTION _copy_chapters(p_src_exam text, p_src_subject text, p_dst_subject_id uuid, p_start_order int DEFAULT 0)
RETURNS void AS $$
DECLARE ch RECORD; v_order int := p_start_order;
BEGIN
  FOR ch IN
    SELECT name, display_order FROM syllabus_chapters
    WHERE subject_id = (SELECT id FROM syllabus_subjects WHERE exam_id = p_src_exam AND name = p_src_subject)
    ORDER BY display_order
  LOOP
    PERFORM _seed_chapter(p_dst_subject_id, ch.name, v_order);
    v_order := v_order + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_physics uuid; v_chem uuid; v_maths uuid; v_bio uuid; v_gk uuid; v_eng uuid; v_lr uuid;
  v_exam_id text;
BEGIN
  -- ============ JEE MAIN ============
  v_physics := _seed_subject('jee-main', 'Physics', 0);
  v_chem := _seed_subject('jee-main', 'Chemistry', 1);
  v_maths := _seed_subject('jee-main', 'Mathematics', 2);

  PERFORM _seed_chapter(v_physics, 'Units and Measurements', 0);
  PERFORM _seed_chapter(v_physics, 'Kinematics', 1);
  PERFORM _seed_chapter(v_physics, 'Laws of Motion', 2);
  PERFORM _seed_chapter(v_physics, 'Work, Energy and Power', 3);
  PERFORM _seed_chapter(v_physics, 'Rotational Motion', 4);
  PERFORM _seed_chapter(v_physics, 'Gravitation', 5);
  PERFORM _seed_chapter(v_physics, 'Properties of Solids and Liquids', 6);
  PERFORM _seed_chapter(v_physics, 'Thermodynamics', 7);
  PERFORM _seed_chapter(v_physics, 'Kinetic Theory of Gases', 8);
  PERFORM _seed_chapter(v_physics, 'Oscillations and Waves', 9);
  PERFORM _seed_chapter(v_physics, 'Electrostatics', 10);
  PERFORM _seed_chapter(v_physics, 'Current Electricity', 11);
  PERFORM _seed_chapter(v_physics, 'Magnetic Effects of Current and Magnetism', 12);
  PERFORM _seed_chapter(v_physics, 'Electromagnetic Induction and Alternating Currents', 13);
  PERFORM _seed_chapter(v_physics, 'Electromagnetic Waves', 14);
  PERFORM _seed_chapter(v_physics, 'Optics', 15);
  PERFORM _seed_chapter(v_physics, 'Dual Nature of Matter and Radiation', 16);
  PERFORM _seed_chapter(v_physics, 'Atoms and Nuclei', 17);
  PERFORM _seed_chapter(v_physics, 'Electronic Devices', 18);
  PERFORM _seed_chapter(v_physics, 'Communication Systems', 19);

  PERFORM _seed_chapter(v_chem, 'Some Basic Concepts of Chemistry', 0);
  PERFORM _seed_chapter(v_chem, 'Atomic Structure', 1);
  PERFORM _seed_chapter(v_chem, 'Classification of Elements and Periodicity', 2);
  PERFORM _seed_chapter(v_chem, 'Chemical Bonding and Molecular Structure', 3);
  PERFORM _seed_chapter(v_chem, 'States of Matter', 4);
  PERFORM _seed_chapter(v_chem, 'Thermodynamics', 5);
  PERFORM _seed_chapter(v_chem, 'Equilibrium', 6);
  PERFORM _seed_chapter(v_chem, 'Redox Reactions', 7);
  PERFORM _seed_chapter(v_chem, 'Hydrogen', 8);
  PERFORM _seed_chapter(v_chem, 'The s-Block Elements', 9);
  PERFORM _seed_chapter(v_chem, 'The p-Block Elements (Group 13 & 14)', 10);
  PERFORM _seed_chapter(v_chem, 'Organic Chemistry — Some Basic Principles', 11);
  PERFORM _seed_chapter(v_chem, 'Hydrocarbons', 12);
  PERFORM _seed_chapter(v_chem, 'Environmental Chemistry', 13);
  PERFORM _seed_chapter(v_chem, 'The Solid State', 14);
  PERFORM _seed_chapter(v_chem, 'Solutions', 15);
  PERFORM _seed_chapter(v_chem, 'Electrochemistry', 16);
  PERFORM _seed_chapter(v_chem, 'Chemical Kinetics', 17);
  PERFORM _seed_chapter(v_chem, 'Surface Chemistry', 18);
  PERFORM _seed_chapter(v_chem, 'The p-Block Elements (Group 15-18)', 19);
  PERFORM _seed_chapter(v_chem, 'The d- and f-Block Elements', 20);
  PERFORM _seed_chapter(v_chem, 'Coordination Compounds', 21);
  PERFORM _seed_chapter(v_chem, 'Haloalkanes and Haloarenes', 22);
  PERFORM _seed_chapter(v_chem, 'Alcohols, Phenols and Ethers', 23);
  PERFORM _seed_chapter(v_chem, 'Aldehydes, Ketones and Carboxylic Acids', 24);
  PERFORM _seed_chapter(v_chem, 'Amines', 25);
  PERFORM _seed_chapter(v_chem, 'Biomolecules', 26);
  PERFORM _seed_chapter(v_chem, 'Polymers', 27);
  PERFORM _seed_chapter(v_chem, 'Chemistry in Everyday Life', 28);

  PERFORM _seed_chapter(v_maths, 'Sets, Relations and Functions', 0);
  PERFORM _seed_chapter(v_maths, 'Complex Numbers and Quadratic Equations', 1);
  PERFORM _seed_chapter(v_maths, 'Matrices and Determinants', 2);
  PERFORM _seed_chapter(v_maths, 'Permutations and Combinations', 3);
  PERFORM _seed_chapter(v_maths, 'Mathematical Induction', 4);
  PERFORM _seed_chapter(v_maths, 'Binomial Theorem and Its Simple Applications', 5);
  PERFORM _seed_chapter(v_maths, 'Sequences and Series', 6);
  PERFORM _seed_chapter(v_maths, 'Limit, Continuity and Differentiability', 7);
  PERFORM _seed_chapter(v_maths, 'Applications of Derivatives', 8);
  PERFORM _seed_chapter(v_maths, 'Integral Calculus', 9);
  PERFORM _seed_chapter(v_maths, 'Applications of Integrals', 10);
  PERFORM _seed_chapter(v_maths, 'Differential Equations', 11);
  PERFORM _seed_chapter(v_maths, 'Coordinate Geometry — Straight Lines', 12);
  PERFORM _seed_chapter(v_maths, 'Coordinate Geometry — Circles', 13);
  PERFORM _seed_chapter(v_maths, 'Coordinate Geometry — Conic Sections', 14);
  PERFORM _seed_chapter(v_maths, 'Three-Dimensional Geometry', 15);
  PERFORM _seed_chapter(v_maths, 'Vector Algebra', 16);
  PERFORM _seed_chapter(v_maths, 'Statistics and Probability', 17);
  PERFORM _seed_chapter(v_maths, 'Trigonometric Functions and Identities', 18);
  PERFORM _seed_chapter(v_maths, 'Inverse Trigonometric Functions', 19);
  PERFORM _seed_chapter(v_maths, 'Mathematical Reasoning', 20);

  -- ============ JEE ADVANCED (extends JEE Main) ============
  v_physics := _seed_subject('jee-advanced', 'Physics', 0);
  v_chem := _seed_subject('jee-advanced', 'Chemistry', 1);
  v_maths := _seed_subject('jee-advanced', 'Mathematics', 2);
  PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
  PERFORM _copy_chapters('jee-main', 'Chemistry', v_chem);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  -- JEE Advanced extra chapters
  PERFORM _seed_chapter(v_physics, 'General Physics (Units, Dimensions, Experimental Skills)', 20);
  PERFORM _seed_chapter(v_physics, 'Practical Physics (Error Analysis, Experiments)', 21);
  PERFORM _seed_chapter(v_chem, 'Practical Chemistry (Salt Analysis, Volumetric Analysis)', 29);
  PERFORM _seed_chapter(v_chem, 'Qualitative Organic Analysis', 30);
  PERFORM _seed_chapter(v_maths, 'Calculus of Several Variables', 21);
  PERFORM _seed_chapter(v_maths, 'Probability Distributions', 22);
  PERFORM _seed_chapter(v_maths, 'Numerical Methods', 23);

  -- ============ NEET UG ============
  v_physics := _seed_subject('neet-ug', 'Physics', 0);
  v_chem := _seed_subject('neet-ug', 'Chemistry', 1);
  v_bio := _seed_subject('neet-ug', 'Botany', 2);
  DECLARE v_zoo uuid;
  BEGIN
    v_zoo := _seed_subject('neet-ug', 'Zoology', 3);

    PERFORM _seed_chapter(v_physics, 'Physical World and Measurement', 0);
    PERFORM _seed_chapter(v_physics, 'Kinematics', 1);
    PERFORM _seed_chapter(v_physics, 'Laws of Motion', 2);
    PERFORM _seed_chapter(v_physics, 'Work, Energy and Power', 3);
    PERFORM _seed_chapter(v_physics, 'Rotational Motion', 4);
    PERFORM _seed_chapter(v_physics, 'Gravitation', 5);
    PERFORM _seed_chapter(v_physics, 'Properties of Bulk Matter', 6);
    PERFORM _seed_chapter(v_physics, 'Thermodynamics', 7);
    PERFORM _seed_chapter(v_physics, 'Kinetic Theory of Gases', 8);
    PERFORM _seed_chapter(v_physics, 'Oscillations and Waves', 9);
    PERFORM _seed_chapter(v_physics, 'Electrostatics', 10);
    PERFORM _seed_chapter(v_physics, 'Current Electricity', 11);
    PERFORM _seed_chapter(v_physics, 'Magnetic Effects of Current and Magnetism', 12);
    PERFORM _seed_chapter(v_physics, 'Electromagnetic Induction and Alternating Currents', 13);
    PERFORM _seed_chapter(v_physics, 'Electromagnetic Waves', 14);
    PERFORM _seed_chapter(v_physics, 'Ray Optics and Optical Instruments', 15);
    PERFORM _seed_chapter(v_physics, 'Wave Optics', 16);
    PERFORM _seed_chapter(v_physics, 'Dual Nature of Matter and Radiation', 17);
    PERFORM _seed_chapter(v_physics, 'Atoms and Nuclei', 18);
    PERFORM _seed_chapter(v_physics, 'Semiconductor Electronics', 19);

    -- Chemistry (same as JEE Main with some renamed)
    PERFORM _seed_chapter(v_chem, 'Some Basic Concepts of Chemistry', 0);
    PERFORM _seed_chapter(v_chem, 'Structure of Atom', 1);
    PERFORM _seed_chapter(v_chem, 'Classification of Elements and Periodicity', 2);
    PERFORM _seed_chapter(v_chem, 'Chemical Bonding and Molecular Structure', 3);
    PERFORM _seed_chapter(v_chem, 'States of Matter', 4);
    PERFORM _seed_chapter(v_chem, 'Thermodynamics', 5);
    PERFORM _seed_chapter(v_chem, 'Equilibrium', 6);
    PERFORM _seed_chapter(v_chem, 'Redox Reactions', 7);
    PERFORM _seed_chapter(v_chem, 'Hydrogen', 8);
    PERFORM _seed_chapter(v_chem, 's-Block Elements', 9);
    PERFORM _seed_chapter(v_chem, 'p-Block Elements', 10);
    PERFORM _seed_chapter(v_chem, 'Organic Chemistry — Basic Principles', 11);
    PERFORM _seed_chapter(v_chem, 'Hydrocarbons', 12);
    PERFORM _seed_chapter(v_chem, 'Environmental Chemistry', 13);
    PERFORM _seed_chapter(v_chem, 'Solid State', 14);
    PERFORM _seed_chapter(v_chem, 'Solutions', 15);
    PERFORM _seed_chapter(v_chem, 'Electrochemistry', 16);
    PERFORM _seed_chapter(v_chem, 'Chemical Kinetics', 17);
    PERFORM _seed_chapter(v_chem, 'Surface Chemistry', 18);
    PERFORM _seed_chapter(v_chem, 'p-Block Elements (Group 15-18)', 19);
    PERFORM _seed_chapter(v_chem, 'd- and f-Block Elements', 20);
    PERFORM _seed_chapter(v_chem, 'Coordination Compounds', 21);
    PERFORM _seed_chapter(v_chem, 'Haloalkanes and Haloarenes', 22);
    PERFORM _seed_chapter(v_chem, 'Alcohols, Phenols and Ethers', 23);
    PERFORM _seed_chapter(v_chem, 'Aldehydes, Ketones and Carboxylic Acids', 24);
    PERFORM _seed_chapter(v_chem, 'Amines', 25);
    PERFORM _seed_chapter(v_chem, 'Biomolecules', 26);
    PERFORM _seed_chapter(v_chem, 'Polymers', 27);
    PERFORM _seed_chapter(v_chem, 'Chemistry in Everyday Life', 28);

    -- Botany
    PERFORM _seed_chapter(v_bio, 'The Living World', 0);
    PERFORM _seed_chapter(v_bio, 'Biological Classification', 1);
    PERFORM _seed_chapter(v_bio, 'Plant Kingdom', 2);
    PERFORM _seed_chapter(v_bio, 'Morphology of Flowering Plants', 3);
    PERFORM _seed_chapter(v_bio, 'Anatomy of Flowering Plants', 4);
    PERFORM _seed_chapter(v_bio, 'Cell — The Unit of Life', 5);
    PERFORM _seed_chapter(v_bio, 'Cell Cycle and Cell Division', 6);
    PERFORM _seed_chapter(v_bio, 'Transport in Plants', 7);
    PERFORM _seed_chapter(v_bio, 'Mineral Nutrition', 8);
    PERFORM _seed_chapter(v_bio, 'Photosynthesis in Higher Plants', 9);
    PERFORM _seed_chapter(v_bio, 'Respiration in Plants', 10);
    PERFORM _seed_chapter(v_bio, 'Plant Growth and Development', 11);
    PERFORM _seed_chapter(v_bio, 'Reproduction in Organisms', 12);
    PERFORM _seed_chapter(v_bio, 'Sexual Reproduction in Flowering Plants', 13);
    PERFORM _seed_chapter(v_bio, 'Principles of Inheritance and Variation', 14);
    PERFORM _seed_chapter(v_bio, 'Molecular Basis of Inheritance', 15);
    PERFORM _seed_chapter(v_bio, 'Strategies for Enhancement in Food Production', 16);
    PERFORM _seed_chapter(v_bio, 'Microbes in Human Welfare', 17);
    PERFORM _seed_chapter(v_bio, 'Biotechnology — Principles and Processes', 18);
    PERFORM _seed_chapter(v_bio, 'Biotechnology and Its Applications', 19);
    PERFORM _seed_chapter(v_bio, 'Organisms and Populations', 20);
    PERFORM _seed_chapter(v_bio, 'Ecosystem', 21);
    PERFORM _seed_chapter(v_bio, 'Biodiversity and Conservation', 22);
    PERFORM _seed_chapter(v_bio, 'Environmental Issues', 23);

    -- Zoology
    PERFORM _seed_chapter(v_zoo, 'Animal Kingdom', 0);
    PERFORM _seed_chapter(v_zoo, 'Structural Organisation in Animals', 1);
    PERFORM _seed_chapter(v_zoo, 'Digestion and Absorption', 2);
    PERFORM _seed_chapter(v_zoo, 'Breathing and Exchange of Gases', 3);
    PERFORM _seed_chapter(v_zoo, 'Body Fluids and Circulation', 4);
    PERFORM _seed_chapter(v_zoo, 'Excretory Products and Their Elimination', 5);
    PERFORM _seed_chapter(v_zoo, 'Locomotion and Movement', 6);
    PERFORM _seed_chapter(v_zoo, 'Neural Control and Coordination', 7);
    PERFORM _seed_chapter(v_zoo, 'Chemical Coordination and Integration', 8);
    PERFORM _seed_chapter(v_zoo, 'Human Reproduction', 9);
    PERFORM _seed_chapter(v_zoo, 'Reproductive Health', 10);
    PERFORM _seed_chapter(v_zoo, 'Evolution', 11);
    PERFORM _seed_chapter(v_zoo, 'Human Health and Disease', 12);
    PERFORM _seed_chapter(v_zoo, 'Strategies for Enhancement in Food Production', 13);
    PERFORM _seed_chapter(v_zoo, 'Microbes in Human Welfare', 14);
    PERFORM _seed_chapter(v_zoo, 'Biotechnology and Its Applications', 15);
    PERFORM _seed_chapter(v_zoo, 'Organisms and Populations', 16);
    PERFORM _seed_chapter(v_zoo, 'Ecosystem', 17);
    PERFORM _seed_chapter(v_zoo, 'Biodiversity and Conservation', 18);
    PERFORM _seed_chapter(v_zoo, 'Environmental Issues', 19);
  END;

  -- ============ BITSAT ============
  v_physics := _seed_subject('bitsat', 'Physics', 0);
  v_chem := _seed_subject('bitsat', 'Chemistry', 1);
  v_maths := _seed_subject('bitsat', 'Mathematics', 2);
  v_eng := _seed_subject('bitsat', 'English', 3);
  v_lr := _seed_subject('bitsat', 'Logical Reasoning', 4);
  PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
  PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  PERFORM _seed_chapter(v_eng, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_eng, 'Grammar', 1);
  PERFORM _seed_chapter(v_eng, 'Vocabulary', 2);
  PERFORM _seed_chapter(v_lr, 'Series', 0);
  PERFORM _seed_chapter(v_lr, 'Analogy', 1);
  PERFORM _seed_chapter(v_lr, 'Classification', 2);
  PERFORM _seed_chapter(v_lr, 'Coding-Decoding', 3);
  PERFORM _seed_chapter(v_lr, 'Blood Relations', 4);
  PERFORM _seed_chapter(v_lr, 'Direction Sense', 5);

  -- ============ WBJEE, MHT CET, COMEDK, VITEEE, KIITEE (same as JEE Main P/C/M) ============
  FOREACH v_exam_id IN ARRAY ARRAY['wbjee','mht-cet','comedk','viteee','kiitee'] LOOP
    v_physics := _seed_subject(v_exam_id, 'Physics', 0);
    v_chem := _seed_subject(v_exam_id, 'Chemistry', 1);
    v_maths := _seed_subject(v_exam_id, 'Mathematics', 2);
    PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
    PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
    PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  END LOOP;

  -- SRMJEEE (has English)
  v_physics := _seed_subject('srmjeee', 'Physics', 0);
  v_chem := _seed_subject('srmjeee', 'Chemistry', 1);
  v_maths := _seed_subject('srmjeee', 'Mathematics', 2);
  v_eng := _seed_subject('srmjeee', 'English', 3);
  PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
  PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  PERFORM _seed_chapter(v_eng, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_eng, 'Grammar', 1);

  -- ============ AIIMS (legacy) ============
  v_physics := _seed_subject('neet-ug-aiims', 'Physics', 0);
  v_chem := _seed_subject('neet-ug-aiims', 'Chemistry', 1);
  v_bio := _seed_subject('neet-ug-aiims', 'Biology', 2);
  v_gk := _seed_subject('neet-ug-aiims', 'General Knowledge', 3);
  PERFORM _copy_chapters('neet-ug', 'Physics', v_physics);
  PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
  PERFORM _copy_chapters('neet-ug', 'Botany', v_bio, 0);
  PERFORM _copy_chapters('neet-ug', 'Zoology', v_bio, 24);
  PERFORM _seed_chapter(v_gk, 'Current Affairs', 0);
  PERFORM _seed_chapter(v_gk, 'General Science', 1);
  PERFORM _seed_chapter(v_gk, 'Static GK', 2);
END $$;