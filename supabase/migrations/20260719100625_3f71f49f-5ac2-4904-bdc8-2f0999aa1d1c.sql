
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto: first ever signup becomes admin, everyone else gets 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Departments (admin-managed)
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  semester_count int NOT NULL DEFAULT 8 CHECK (semester_count BETWEEN 1 AND 12),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read departments" ON public.departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Subjects
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  credit_hours int NOT NULL DEFAULT 3 CHECK (credit_hours BETWEEN 1 AND 6),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.subjects (department_id);
GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER dept_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subj_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admins can view all GPA/CGPA records (read-only)
CREATE POLICY "admins read all gpa" ON public.gpa_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read all cgpa" ON public.cgpa_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Seed departments
INSERT INTO public.departments (key, label, semester_count, sort_order) VALUES
  ('agriculture','Agriculture',8,10),
  ('biotechnology','Biotechnology',8,20),
  ('botany','Botany',8,30),
  ('chemistry','Chemistry',8,40),
  ('computer-science','Computer Science',8,50),
  ('economics','Economics',8,60),
  ('education','Education',8,70),
  ('electrical-engineering','Electrical Engineering',8,80),
  ('english','English',8,90),
  ('environmental-sciences','Environmental Sciences',8,100),
  ('geology','Geology',8,110),
  ('international-relations','International Relations',8,120),
  ('islamic-and-arabic-studies','Islamic and Arabic Studies',8,130),
  ('law','Law',10,140),
  ('business-administration','Business Administration',8,150),
  ('management-sciences','Management Sciences',8,160),
  ('mathematics','Mathematics',8,170),
  ('microbiology','Microbiology',8,180),
  ('biology','Biology',8,190),
  ('physics','Physics',8,200),
  ('political-science','Political Science',8,210),
  ('psychology','Psychology',8,220),
  ('sociology','Sociology',8,230),
  ('tourism-and-hotel-management','Tourism and Hotel Management',8,240),
  ('urdu','Urdu',8,250),
  ('zoology','Zoology',8,260);

-- Seed subjects for known departments
WITH d AS (SELECT id FROM public.departments WHERE key='computer-science')
INSERT INTO public.subjects (department_id, name, credit_hours, sort_order)
SELECT d.id, s.name, s.ch, s.ord FROM d, (VALUES
  ('Application of ICT',3,10),('Programming Fundamentals',4,20),('Functional English',3,30),
  ('Islamic Studies',2,40),('Civics and Community Engagement',2,50),('Applied Physics',3,60),
  ('Linear Algebra',3,70),('Technical and Business Writing',3,80),('Ideology and Constitution of Pakistan',2,90),
  ('Digital Logic Design',3,100),('Object Oriented Programming',4,110),('Discrete Structures',3,120),
  ('Data Structures',4,130),('Probability and Statistics',3,140),('HCI & Computer Graphics',3,150),
  ('Principles of Management',2,160),('Expository Writing',3,170),('Web Technologies',3,180),
  ('Compiler Construction',3,190),('Analysis of Algorithms',3,200),('Marketing Management',3,210),
  ('Calculus and Analytical Geometry',3,220),('Web Engineering',3,230),('Pakistan Studies',2,240),
  ('Operating Systems',3,250),('Software Engineering',3,260),('Theory of Automata',3,270),
  ('Computer Architecture',3,280),('Data Communication and Computer Networks',4,290),
  ('Computer Org. & Assembly Language',3,300),('Database Systems',4,310),('Artificial Intelligence',3,320),
  ('Advance Programming – Visual Pro',3,330),('Mobile App Development',3,340),
  ('Software Testing & Quality Assurance',3,350),('Professional Practices',2,360),
  ('Parallel & Distributed Computing',3,370),('Information Security',3,380),('Multivariable Calculus',3,390),
  ('Final Year Project – I',2,400),('Numerical Analysis',3,410),('Entrepreneurship',2,420),
  ('Cyber Security',3,430),('Advance Database Management System',3,440),('Final Year Project – II',4,450)
) AS s(name,ch,ord);

WITH d AS (SELECT id FROM public.departments WHERE key='electrical-engineering')
INSERT INTO public.subjects (department_id, name, credit_hours, sort_order)
SELECT d.id, s.name, s.ch, s.ord FROM d, (VALUES
  ('Basic Electrical Engineering',4,10),('Calculus I',3,20),('Engineering Drawing',2,30),
  ('Physics',3,40),('Islamic Studies',2,50),('Circuit Analysis',4,60),('Calculus II',3,70),
  ('Programming Fundamentals',3,80),('Applied Physics',3,90),('Pakistan Studies',2,100),
  ('Digital Electronics',4,110),('Signals and Systems',3,120),('Electromagnetic Theory',3,130),
  ('Control Systems',3,140),('Electrical Machines',3,150)
) AS s(name,ch,ord);

WITH d AS (SELECT id FROM public.departments WHERE key='business-administration')
INSERT INTO public.subjects (department_id, name, credit_hours, sort_order)
SELECT d.id, s.name, s.ch, s.ord FROM d, (VALUES
  ('Introduction to Business',3,10),('Principles of Management',3,20),('Financial Accounting',3,30),
  ('Microeconomics',3,40),('Business Mathematics',3,50),('Marketing Principles',3,60),
  ('Organizational Behavior',3,70),('Business Statistics',3,80),('Macroeconomics',3,90),
  ('Business Communication',3,100)
) AS s(name,ch,ord);

WITH d AS (SELECT id FROM public.departments WHERE key='biology')
INSERT INTO public.subjects (department_id, name, credit_hours, sort_order)
SELECT d.id, s.name, s.ch, s.ord FROM d, (VALUES
  ('Introduction to Biology',4,10),('General Chemistry',4,20),('Cell Biology',3,30),
  ('Ecology',3,40),('Scientific Methods',2,50),('Genetics',4,60),('Microbiology',4,70),
  ('Biochemistry',4,80),('Evolutionary Biology',3,90),('Plant Physiology',3,100)
) AS s(name,ch,ord);

WITH d AS (SELECT id FROM public.departments WHERE key='english')
INSERT INTO public.subjects (department_id, name, credit_hours, sort_order)
SELECT d.id, s.name, s.ch, s.ord FROM d, (VALUES
  ('Introduction to Literature',3,10),('Composition I',3,20),('Linguistics',3,30),
  ('Poetry',3,40),('Drama',3,50),('Composition II',3,60),('American Literature',3,70),
  ('British Literature',3,80),('Literary Theory',3,90),('Creative Writing',3,100)
) AS s(name,ch,ord);
