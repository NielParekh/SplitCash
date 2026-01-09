# GraphQL API Conversion Guide

This guide explains how to convert the REST API to GraphQL for SplitCash.

## Current REST API Endpoints

1. `GET /api/transactions` - Get all transactions (with filters: type, month, year)
2. `POST /api/transactions` - Create new transaction
3. `PATCH /api/transactions/<id>` - Update transaction
4. `DELETE /api/transactions/<id>` - Delete transaction
5. `GET /api/summary` - Get financial summary (with filters: month, year)

## GraphQL Equivalents

### Queries (GET operations)
- `transactions(filters)` - Get all transactions
- `transaction(id)` - Get single transaction
- `summary(filters)` - Get financial summary

### Mutations (POST/PATCH/DELETE operations)
- `createTransaction(input)` - Create transaction
- `updateTransaction(id, input)` - Update transaction
- `deleteTransaction(id)` - Delete transaction

## Implementation Steps

### Step 1: Install GraphQL Library

**Option A: Graphene (Popular for Flask)**
```bash
pip install graphene graphene-sqlalchemy flask-graphql
```

**Option B: Ariadne (Modern, schema-first)**
```bash
pip install ariadne
```

**Option C: Flask-GraphQL**
```bash
pip install flask-graphql
```

**Recommendation**: Use **Graphene** - it's mature and well-documented for Flask.

### Step 2: Update requirements.txt

Add to `requirements.txt`:
```
graphene==3.3
Flask-GraphQL==2.0.1
```

### Step 3: Define GraphQL Schema

Create `schema.py`:

```python
import graphene
from graphene import ObjectType, Field, List, Int, String, Float, Boolean, DateTime
from datetime import datetime

class TransactionType(graphene.ObjectType):
    """Transaction GraphQL Type"""
    id = Int(required=True)
    type = String(required=True)
    amount = Float(required=True)
    category = String()
    date = String(required=True)
    created_at = String()

class SummaryType(graphene.ObjectType):
    """Summary GraphQL Type"""
    total_income = Float(required=True)
    total_expenses = Float(required=True)
    balance = Float(required=True)

class TransactionFilters(graphene.InputObjectType):
    """Input filters for transactions"""
    type = String()
    month = Int()
    year = Int()

class TransactionInput(graphene.InputObjectType):
    """Input for creating/updating transactions"""
    type = String(required=True)
    amount = Float(required=True)
    category = String()
    date = String(required=True)

class Query(ObjectType):
    """GraphQL Queries"""
    
    # Get all transactions
    transactions = List(
        TransactionType,
        filters=TransactionFilters()
    )
    
    # Get single transaction
    transaction = Field(TransactionType, id=Int(required=True))
    
    # Get summary
    summary = Field(SummaryType, month=Int(), year=Int())
    
    def resolve_transactions(self, info, filters=None):
        from app import read_transactions, filter_transactions
        
        transactions = read_transactions()
        
        if filters:
            filtered = filter_transactions(
                transactions,
                filters.get('type'),
                filters.get('month'),
                filters.get('year')
            )
        else:
            filtered = transactions
        
        filtered.sort(key=lambda x: (x['date'], x.get('created_at', '')), reverse=True)
        return filtered
    
    def resolve_transaction(self, info, id):
        from app import read_transactions
        
        transactions = read_transactions()
        for t in transactions:
            if t['id'] == id:
                return t
        return None
    
    def resolve_summary(self, info, month=None, year=None):
        from app import read_transactions, filter_transactions
        
        transactions = read_transactions()
        filtered = filter_transactions(transactions, None, month, year)
        
        total_income = sum(t['amount'] for t in filtered if t['type'] == 'income')
        total_expenses = sum(t['amount'] for t in filtered if t['type'] == 'expense')
        balance = total_income - total_expenses
        
        return SummaryType(
            total_income=total_income,
            total_expenses=total_expenses,
            balance=balance
        )

class CreateTransaction(graphene.Mutation):
    """Create a new transaction"""
    class Arguments:
        input = TransactionInput(required=True)
    
    transaction = Field(TransactionType)
    success = Boolean()
    error = String()
    
    def mutate(self, info, input):
        from app import read_transactions, write_transactions, get_next_id, ALLOWED_CATEGORIES
        from datetime import datetime
        
        type_val = input.get('type')
        amount = input.get('amount')
        category = input.get('category')
        date = input.get('date')
        
        # Validation
        if not type_val or not amount or not date:
            return CreateTransaction(success=False, error='Missing required fields')
        
        if type_val not in ['expense', 'income']:
            return CreateTransaction(success=False, error='Type must be either "expense" or "income"')
        
        if float(amount) <= 0:
            return CreateTransaction(success=False, error='Amount must be greater than 0')
        
        if type_val == 'expense':
            if not category:
                return CreateTransaction(success=False, error='Category is required for expenses')
            if category not in ALLOWED_CATEGORIES:
                return CreateTransaction(success=False, error=f'Category must be one of {sorted(ALLOWED_CATEGORIES)}')
        else:
            category = None
        
        transactions = read_transactions()
        
        new_transaction = {
            'id': get_next_id(transactions),
            'type': type_val,
            'amount': float(amount),
            'category': category if category else None,
            'date': date,
            'created_at': datetime.now().isoformat()
        }
        
        transactions.append(new_transaction)
        write_transactions(transactions)
        
        return CreateTransaction(transaction=new_transaction, success=True)

class UpdateTransaction(graphene.Mutation):
    """Update an existing transaction"""
    class Arguments:
        id = Int(required=True)
        input = TransactionInput(required=True)
    
    transaction = Field(TransactionType)
    success = Boolean()
    error = String()
    
    def mutate(self, info, id, input):
        from app import read_transactions, write_transactions, ALLOWED_CATEGORIES
        
        type_val = input.get('type')
        amount = input.get('amount')
        category = input.get('category')
        date = input.get('date')
        
        # Validation
        if not type_val or not amount or not date:
            return UpdateTransaction(success=False, error='Missing required fields')
        
        if type_val not in ['expense', 'income']:
            return UpdateTransaction(success=False, error='Type must be either "expense" or "income"')
        
        if float(amount) <= 0:
            return UpdateTransaction(success=False, error='Amount must be greater than 0')
        
        if type_val == 'expense':
            if not category:
                return UpdateTransaction(success=False, error='Category is required for expenses')
            if category not in ALLOWED_CATEGORIES:
                return UpdateTransaction(success=False, error=f'Category must be one of {sorted(ALLOWED_CATEGORIES)}')
        else:
            category = None
        
        transactions = read_transactions()
        
        for i, t in enumerate(transactions):
            if t['id'] == id:
                transactions[i].update({
                    'type': type_val,
                    'amount': float(amount),
                    'category': category if category else None,
                    'date': date
                })
                write_transactions(transactions)
                return UpdateTransaction(transaction=transactions[i], success=True)
        
        return UpdateTransaction(success=False, error='Transaction not found')

class DeleteTransaction(graphene.Mutation):
    """Delete a transaction"""
    class Arguments:
        id = Int(required=True)
    
    success = Boolean()
    error = String()
    
    def mutate(self, info, id):
        from app import read_transactions, write_transactions
        
        transactions = read_transactions()
        
        for i, t in enumerate(transactions):
            if t['id'] == id:
                transactions.pop(i)
                write_transactions(transactions)
                return DeleteTransaction(success=True)
        
        return DeleteTransaction(success=False, error='Transaction not found')

class Mutation(ObjectType):
    """GraphQL Mutations"""
    create_transaction = CreateTransaction.Field()
    update_transaction = UpdateTransaction.Field()
    delete_transaction = DeleteTransaction.Field()

# Create schema
schema = graphene.Schema(query=Query, mutation=Mutation)
```

### Step 4: Add GraphQL Endpoint to app.py

**Location**: Add after line 119 (after the logging setup)

```python
from flask_graphql import GraphQLView
from schema import schema

# Add GraphQL endpoint
app.add_url_rule(
    '/graphql',
    view_func=GraphQLView.as_view(
        'graphql',
        schema=schema,
        graphiql=True  # Enable GraphQL IDE for testing
    )
)
```

### Step 5: Update Frontend (app.js)

**Location**: `app.js` - Replace all API calls

**Current REST approach:**
```javascript
fetch('/api/transactions')
```

**New GraphQL approach:**
```javascript
// GraphQL query helper
async function graphqlQuery(query, variables = {}) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

// Get transactions
const GET_TRANSACTIONS = `
  query GetTransactions($filters: TransactionFilters) {
    transactions(filters: $filters) {
      id
      type
      amount
      category
      date
      createdAt
    }
  }
`;

async function fetchTransactions() {
  const data = await graphqlQuery(GET_TRANSACTIONS);
  return data.transactions;
}

// Create transaction
const CREATE_TRANSACTION = `
  mutation CreateTransaction($input: TransactionInput!) {
    createTransaction(input: $input) {
      success
      error
      transaction {
        id
        type
        amount
        category
        date
      }
    }
  }
`;

async function createTransaction(input) {
  const data = await graphqlQuery(CREATE_TRANSACTION, { input });
  if (!data.createTransaction.success) {
    throw new Error(data.createTransaction.error);
  }
  return data.createTransaction.transaction;
}
```

## Files to Create/Modify

| File | Action | Lines/Location |
|------|--------|----------------|
| `schema.py` | **CREATE** | New file with GraphQL schema |
| `app.py` | **MODIFY** | Add GraphQL endpoint (~lines 120-130) |
| `app.py` | **MODIFY** | Add import at top (line ~2) |
| `requirements.txt` | **MODIFY** | Add graphene and flask-graphql |
| `app.js` | **MODIFY** | Replace all REST API calls with GraphQL |

## GraphQL vs REST Comparison

### REST (Current)
```javascript
// Get transactions
GET /api/transactions?type=expense&year=2024

// Create transaction
POST /api/transactions
Body: { type: "expense", amount: 100, ... }

// Update transaction
PATCH /api/transactions/123
Body: { amount: 150 }

// Delete transaction
DELETE /api/transactions/123
```

### GraphQL (Proposed)
```graphql
# Get transactions
query {
  transactions(filters: { type: "expense", year: 2024 }) {
    id
    type
    amount
    category
    date
  }
}

# Create transaction
mutation {
  createTransaction(input: {
    type: "expense"
    amount: 100
    category: "Food"
    date: "2024-01-15"
  }) {
    success
    transaction {
      id
      type
      amount
    }
  }
}

# Update transaction
mutation {
  updateTransaction(id: 123, input: { amount: 150 }) {
    success
    transaction {
      id
      amount
    }
  }
}

# Delete transaction
mutation {
  deleteTransaction(id: 123) {
    success
  }
}

# Get summary
query {
  summary(year: 2024) {
    totalIncome
    totalExpenses
    balance
  }
}
```

## Advantages of GraphQL

✅ **Single Endpoint** - All queries go to `/graphql`  
✅ **Flexible Queries** - Request only needed fields  
✅ **Strong Typing** - Schema defines data structure  
✅ **Introspection** - Self-documenting API  
✅ **GraphiQL IDE** - Built-in query testing interface  
✅ **Reduced Over-fetching** - Get exactly what you need  

## Disadvantages

❌ **Learning Curve** - Team needs to learn GraphQL  
❌ **More Complex** - Schema definition required  
❌ **Caching** - More complex than REST  
❌ **File Uploads** - Requires additional setup  
❌ **Error Handling** - Different error format  

## Testing GraphQL

Once implemented, you can test at:
```
http://localhost:5000/graphql
```

GraphiQL interface allows you to:
- Write queries interactively
- See schema documentation
- Test mutations
- Auto-complete fields

## Migration Strategy

**Option 1: Keep Both (Recommended for Transition)**
- Keep REST endpoints active
- Add GraphQL endpoint
- Gradually migrate frontend
- Remove REST when fully migrated

**Option 2: Full Replacement**
- Replace all REST endpoints with GraphQL
- Update frontend completely
- Remove REST code

## Estimated Implementation Time

- **Schema creation**: 1-2 hours
- **Backend integration**: 1 hour
- **Frontend updates**: 2-3 hours
- **Testing**: 1 hour
- **Total**: 5-7 hours

## Next Steps

1. Install GraphQL library (graphene)
2. Create `schema.py` with GraphQL schema
3. Add GraphQL endpoint to `app.py`
4. Update `app.js` to use GraphQL queries
5. Test with GraphiQL interface
6. Deploy and verify
