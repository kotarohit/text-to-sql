-- 1. Top 10 products by revenue
SELECT Model_ID, SUM(Revenue) AS total_revenue
FROM revenue
GROUP BY Model_ID
ORDER BY total_revenue DESC
LIMIT 10;

-- 2. Total units sold per dealer
SELECT Dealer_ID, SUM(Units_Sold) AS total_units
FROM revenue
GROUP BY Dealer_ID
ORDER BY total_units DESC;

-- 3. Revenue by country (joining dealer → branch → country)
SELECT c.Country_Name, SUM(r.Revenue) AS total_revenue
FROM revenue r
JOIN dealer d ON r.Dealer_ID = d.Dealer_ID
JOIN branch b ON d.Branch_ID = b.Branch_ID
JOIN country c ON b.Country_ID = c.Country_ID
GROUP BY c.Country_Name
ORDER BY total_revenue DESC;

-- 4. Monthly revenue trend
SELECT d.Month, d.Year, SUM(r.Revenue) AS monthly_revenue
FROM revenue r
JOIN date d ON r.Date_ID = d.Date_ID
GROUP BY d.Year, d.Month
ORDER BY d.Year, d.Month;

-- 5. Top 5 dealers by average revenue per unit
SELECT Dealer_ID, AVG(Revenue / NULLIF(Units_Sold, 0)) AS avg_revenue_per_unit
FROM revenue
GROUP BY Dealer_ID
ORDER BY avg_revenue_per_unit DESC
LIMIT 5;

-- 6. Most popular model (by units sold)
SELECT Model_ID, SUM(Units_Sold) AS total_units
FROM revenue
GROUP BY Model_ID
ORDER BY total_units DESC
LIMIT 1;

-- 7. Revenue by product category (join product table)
SELECT p.Category, SUM(r.Revenue) AS total_revenue
FROM revenue r
JOIN product p ON r.Model_ID = p.Model_ID
GROUP BY p.Category
ORDER BY total_revenue DESC;

-- 8. Dealers with no sales (LEFT JOIN)
SELECT d.Dealer_ID
FROM dealer d
LEFT JOIN revenue r ON d.Dealer_ID = r.Dealer_ID
WHERE r.Dealer_ID IS NULL;

-- 9. Daily revenue trend for a given dealer (replace DLR0001)
SELECT d.Full_Date, r.Revenue
FROM revenue r
JOIN date d ON r.Date_ID = d.Date_ID
WHERE r.Dealer_ID = 'DLR0001'
ORDER BY d.Full_Date;

-- 10. Top 5 branches by total sales
SELECT b.Branch_ID, SUM(r.Revenue) AS total_revenue
FROM revenue r
JOIN branch b ON r.Branch_ID = b.Branch_ID
GROUP BY b.Branch_ID
ORDER BY total_revenue DESC
LIMIT 5;