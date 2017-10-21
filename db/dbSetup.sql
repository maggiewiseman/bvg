DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    business_structure VARCHAR(255),
    gen_revenue BOOLEAN,
    amt_revenue VARCHAR(255),
    valid_subscription BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);





-- INSERT INTO users (first_name, last_name, email, password) VALUES ('Leo', 'Dicap', 'leo@gmail', 'rose');
--
-- INSERT INTO users (first_name, last_name, email, password) VALUES ('Maggie', 'Wiseman', 'mw@gmail', '$2a$10$uC5KEwHDIUBkEqoBy8BLqO2X0i7hcFdbBGRI4r545Kg21FDAvnwhO');
--
--
-- INSERT INTO signatures (signature, user_id) VALUES ('leos sig', (SELECT id from users WHERE id='1'));
-- INSERT INTO signatures (signature, user_id) VALUES ('nonsense text', (SELECT id from users WHERE id='2'));
--
--
-- INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ((SELECT id from users WHERE id='2'), '37', 'Washington', 'mwiseman.com');
--
-- INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ((SELECT id from users WHERE id='1'), '42', 'LA', 'leo.com');

-- SELECT users.first_name, users.last_name FROM users JOIN signatures ON users.id = signatures.user_id;
--
-- SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users INNER JOIN signatures ON users.id = signatures.user_id JOIN user_profiles ON users.id = user_profiles.user_id;

-- SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users INNER JOIN signatures ON users.id = signatures.user_id JOIN user_profiles ON users.id = user_profiles.user_id WHERE user_profiles.city = 'Washington';

-- SELECT users.email, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users INNER JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = 7;
-- select a.name,b.manufacturer_id,c.id,c.item_desc
-- from manufacturers as a
-- inner join
-- item_manufacturers as b
-- on b.manufacturer_id=a.id
-- inner join item as c
-- on c.id=b.item_id
-- SELECT age FROM user_profiles WHERE user_id = 2;

-- SELECT signature FROM signatures WHERE user_id = 1;
-- SELECT password FROM users WHERE email = 'leo@gmail';
--
-- SELECT id, first_name, last_name, password FROM users WHERE email = 'leo@gmail';
--
-- SELECT id FROM signatures WHERE user_id = 25;
--
--
-- SELECT first_name, last_name FROM signatures;
--
--
--
-- SELECT COUNT(*) FROM signatures;
