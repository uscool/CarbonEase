import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Box,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [totalCarbon, setTotalCarbon] = useState(0);
  const [totalWater, setTotalWater] = useState(0);
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [billName, setBillName] = useState('');
  const [bills, setBills] = useState([]);
  const [alert, setAlert] = useState(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const loadData = async () => {
    try {
      // Load ingredients
      const response = await fetch('/data/ingredients.csv');
      if (!response.ok) {
        throw new Error('Failed to load ingredients');
      }
      const csvText = await response.text();
      const parsedData = Papa.parse(csvText, { header: true });
      setIngredients(parsedData.data);

      // Load dishes
      const dishesResponse = await fetch('http://localhost:3001/api/dishes');
      if (!dishesResponse.ok) {
        throw new Error('Failed to load dishes');
      }
      const dishesData = await dishesResponse.json();
      setDishes(dishesData);

      // Load bills
      const billsResponse = await fetch('http://localhost:3001/api/bills');
      if (!billsResponse.ok) {
        throw new Error('Failed to load bills');
      }
      const billsData = await billsResponse.json();
      // Filter out checked-out bills
      const activeBills = billsData.filter(bill => bill['CheckedOut'] !== 'true');
      setBills(activeBills);
    } catch (error) {
      console.error('Error loading data:', error);
      setAlert({ type: 'error', message: 'Error loading data: ' + error.message });
    }
  };

  // Load data only once when component mounts
  useEffect(() => {
    loadData();
  }, []); // Empty dependency array means this runs only once on mount

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleIngredientClick = (ingredient) => {
    setSelectedIngredients([...selectedIngredients, ingredient]);
    setTotalCarbon(prev => prev + parseFloat(ingredient['Carbon Footprint (kg CO2e/kg)']));
    setTotalWater(prev => prev + parseFloat(ingredient['Water Usage (L/kg)']));
  };

  const handleSaveDish = async () => {
    try {
      if (!dishName || selectedIngredients.length === 0 || !dishPrice) {
        setAlert({ type: 'error', message: 'Please fill in all fields' });
        return;
      }

      const newDish = {
        'Dish Name': dishName,
        'Ingredients': selectedIngredients.map(ing => ing.Ingredient).join(', '),
        'Total Carbon Footprint (kg CO2e)': totalCarbon.toFixed(2),
        'Total Water Usage (L)': totalWater.toFixed(2),
        'Price (INR)': parseFloat(dishPrice).toFixed(2)
      };

      const response = await fetch('http://localhost:3001/api/dishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDish)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save dish');
      }

      // Update dishes list without refreshing the page
      setDishes(prevDishes => [...prevDishes, newDish]);

      // Reset form
      setDishName('');
      setDishPrice('');
      setSelectedIngredients([]);
      setTotalCarbon(0);
      setTotalWater(0);
      setOpenDialog(false);

      setAlert({ type: 'success', message: 'Dish saved successfully!' });
    } catch (error) {
      console.error('Error saving dish:', error);
      setAlert({ type: 'error', message: error.message || 'Failed to save dish' });
    }
  };

  const handleDishSelect = (dish) => {
    setSelectedDishes([...selectedDishes, dish]);
  };

  const handleSaveBill = async () => {
    try {
      if (!billName || selectedDishes.length === 0) {
        setAlert({ type: 'error', message: 'Please fill in all fields' });
        return;
      }

      const totalBillCarbon = selectedDishes.reduce((sum, dish) => {
        const carbon = parseFloat(dish['Total Carbon Footprint (kg CO2e)']);
        return sum + (isNaN(carbon) ? 0 : carbon);
      }, 0);
      
      const totalBillWater = selectedDishes.reduce((sum, dish) => {
        const water = parseFloat(dish['Total Water Usage (L)']);
        return sum + (isNaN(water) ? 0 : water);
      }, 0);

      const totalBillPrice = selectedDishes.reduce((sum, dish) => {
        const price = parseFloat(dish['Price (INR)']);
        return sum + (isNaN(price) ? 0 : price);
      }, 0);

      const newBill = {
        'Bill Name': billName,
        'Dishes': selectedDishes.map(d => d['Dish Name']).join(', '),
        'Total Carbon Footprint (kg CO2e)': totalBillCarbon.toFixed(2),
        'Total Water Usage (L)': totalBillWater.toFixed(2),
        'Total Price (INR)': totalBillPrice.toFixed(2),
        'Date Created': new Date().toISOString().split('T')[0],
        'CheckedOut': 'false'
      };

      const response = await fetch('http://localhost:3001/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBill)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save bill');
      }

      // Update bills list without refreshing the page
      setBills(prevBills => [...prevBills, newBill]);

      // Reset form
      setBillName('');
      setSelectedDishes([]);
      setAlert({ type: 'success', message: 'Bill saved successfully!' });
    } catch (error) {
      console.error('Error saving bill:', error);
      setAlert({ type: 'error', message: error.message || 'Error saving bill' });
    }
  };

  const getCategoryData = () => {
    const categoryMap = {};
    selectedIngredients.forEach(ingredient => {
      const category = ingredient.Category;
      const carbon = parseFloat(ingredient['Carbon Footprint (kg CO2e/kg)']);
      categoryMap[category] = (categoryMap[category] || 0) + carbon;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const handleCheckout = (bill) => {
    console.log('Opening checkout for bill:', bill); // Debug log
    setSelectedBill(bill);
    setCheckoutDialogOpen(true);
  };

  const handleProcessPayment = async () => {
    try {
      if (!selectedBill) {
        setAlert({ type: 'error', message: 'No bill selected for checkout' });
        return;
      }

      const response = await fetch(`http://localhost:3001/api/bills/${encodeURIComponent(selectedBill['Bill Name'])}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      // Update the bills list by filtering out the checked out bill
      setBills(prevBills => {
        const updatedBills = prevBills.filter(bill => bill['Bill Name'] !== selectedBill['Bill Name']);
        return updatedBills;
      });

      setAlert({ type: 'success', message: 'Payment processed successfully!' });
      handleCheckoutClose();
    } catch (error) {
      console.error('Error processing payment:', error);
      setAlert({ type: 'error', message: error.message || 'Failed to process payment' });
    }
  };

  const handleCheckoutClose = () => {
    setCheckoutDialogOpen(false);
    setSelectedBill(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Carbon Footprint Dashboard
      </Typography>

      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 2, display: 'inline-block' }}
        >
          {alert.message}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Dishes" />
          <Tab label="Bills" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} justifyContent="center">
          {/* Summary Cards */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Carbon Footprint</Typography>
                <Typography variant="h4">{totalCarbon.toFixed(2)} kg CO2e</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Water Usage</Typography>
                <Typography variant="h4">{totalWater.toFixed(2)} L</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Save Dish Button */}
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => setOpenDialog(true)}
              disabled={selectedIngredients.length === 0}
            >
              Save Dish
            </Button>
          </Grid>

          {/* Ingredients Grid */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Select Ingredients</Typography>
              <Grid container spacing={1} justifyContent="center">
                {ingredients.map((ingredient, index) => (
                  <Grid item key={index}>
                    <Button
                      variant="contained"
                      onClick={() => handleIngredientClick(ingredient)}
                      sx={{ m: 0.5 }}
                    >
                      {ingredient.Ingredient}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Carbon Footprint by Category</Typography>
              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                <BarChart
                  width={800}
                  height={300}
                  data={getCategoryData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Carbon Footprint (kg CO2e)" />
                </BarChart>
              </Box>
            </Paper>
          </Grid>

          {/* Selected Ingredients */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Selected Ingredients</Typography>
              <Grid container spacing={1} justifyContent="center">
                {selectedIngredients.map((ingredient, index) => (
                  <Grid item key={index}>
                    <Button
                      variant="outlined"
                      sx={{ m: 0.5 }}
                    >
                      {ingredient.Ingredient}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Saved Dishes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Saved Dishes</Typography>
              <Grid container spacing={2} justifyContent="center">
                {dishes.map((dish, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{dish['Dish Name']}</Typography>
                        <Typography variant="body2">Carbon: {dish['Total Carbon Footprint (kg CO2e)']} kg CO2e</Typography>
                        <Typography variant="body2">Water: {dish['Total Water Usage (L)']} L</Typography>
                        <Typography variant="body2">Price: ₹{dish['Price (INR)']}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {dish['Date Created']}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Save Dish Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Save New Dish</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Dish Name"
              fullWidth
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Price (INR)"
              type="number"
              fullWidth
              value={dishPrice}
              onChange={(e) => setDishPrice(e.target.value)}
            />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Total Carbon Footprint: {totalCarbon.toFixed(2)} kg CO2e
            </Typography>
            <Typography variant="body2">
              Total Water Usage: {totalWater.toFixed(2)} L
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDish} disabled={!dishName || !dishPrice}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3} justifyContent="center">
          {/* Bill Name Input */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bill Name"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
            />
          </Grid>

          {/* Available Dishes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Available Dishes</Typography>
              <Grid container spacing={1} justifyContent="center">
                {dishes.map((dish, index) => (
                  <Grid item key={index}>
                    <Button
                      variant="contained"
                      onClick={() => handleDishSelect(dish)}
                      sx={{ m: 0.5 }}
                    >
                      {dish['Dish Name']} (₹{dish['Price (INR)']})
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Selected Dishes Table */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Selected Dishes</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Dish Name</TableCell>
                      <TableCell align="right">Carbon Footprint (kg CO2e)</TableCell>
                      <TableCell align="right">Water Usage (L)</TableCell>
                      <TableCell align="right">Price (INR)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedDishes.map((dish, index) => (
                      <TableRow key={index}>
                        <TableCell>{dish['Dish Name']}</TableCell>
                        <TableCell align="right">{dish['Total Carbon Footprint (kg CO2e)']}</TableCell>
                        <TableCell align="right">{dish['Total Water Usage (L)']}</TableCell>
                        <TableCell align="right">₹{dish['Price (INR)']}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Save Bill Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveBill}
              disabled={!billName || selectedDishes.length === 0}
            >
              Save Bill
            </Button>
          </Grid>

          {/* Saved Bills */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Saved Bills</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bill Name</TableCell>
                      <TableCell>Dishes</TableCell>
                      <TableCell align="right">Total Carbon (kg CO2e)</TableCell>
                      <TableCell align="right">Total Water (L)</TableCell>
                      <TableCell align="right">Total Price (INR)</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bills.filter(bill => bill['CheckedOut'] !== 'true').map((bill, index) => (
                      <TableRow key={index}>
                        <TableCell>{bill['Bill Name']}</TableCell>
                        <TableCell>{bill['Dishes']}</TableCell>
                        <TableCell align="right">{bill['Total Carbon Footprint (kg CO2e)']}</TableCell>
                        <TableCell align="right">{bill['Total Water Usage (L)']}</TableCell>
                        <TableCell align="right">₹{bill['Total Price (INR)']}</TableCell>
                        <TableCell>{bill['Date Created']}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleCheckout(bill)}
                            size="small"
                          >
                            Checkout
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Checkout Dialog */}
        <Dialog 
          open={checkoutDialogOpen} 
          onClose={handleCheckoutClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Bill Checkout</DialogTitle>
          <DialogContent>
            {selectedBill && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedBill['Bill Name']}
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Dishes:
                </Typography>
                <List>
                  {selectedBill['Dishes'].split(', ').map((dish, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={dish} />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      Carbon Footprint:
                    </Typography>
                  </Grid>
                  <Grid item xs={6} align="right">
                    <Typography variant="body1">
                      {selectedBill['Total Carbon Footprint (kg CO2e)']} kg CO2e
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body1">
                      Water Usage:
                    </Typography>
                  </Grid>
                  <Grid item xs={6} align="right">
                    <Typography variant="body1">
                      {selectedBill['Total Water Usage (L)']} L
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="h6">
                      Total Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6} align="right">
                    <Typography variant="h6">
                      ₹{selectedBill['Total Price (INR)']}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" align="center">
                  Date: {selectedBill['Date Created']}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCheckoutClose}>Cancel</Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleProcessPayment}
            >
              Process Payment
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>
    </Container>
  );
}

export default App; 