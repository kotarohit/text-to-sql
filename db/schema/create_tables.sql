-- branch table
CREATE TABLE branch (
    branch_id INT PRIMARY KEY,
    branch_nm TEXT,
    country_name TEXT
);

-- country table
CREATE TABLE country (
    country_id INT PRIMARY KEY,
    country_name TEXT
);

-- date table
CREATE TABLE date (
    date_id INT PRIMARY KEY,
    date DATE,
    year INT,
    month TEXT,
    quarter TEXT
);

-- dealer table
CREATE TABLE dealer (
    dealer_id INT PRIMARY KEY,
    dealer_nm TEXT,
    location_id INT,
    location_nm TEXT,
    country_id INT
);

-- product table
CREATE TABLE product (
    model_id INT PRIMARY KEY,
    product_name TEXT,
    model_name TEXT
);

-- revenue table (fact)
CREATE TABLE revenue (
    dealer_id INT,
    model_id INT,
    branch_id INT,
    date_id INT,
    units_sold INT,
    revenue NUMERIC,
    PRIMARY KEY (dealer_id, model_id, branch_id, date_id)
);