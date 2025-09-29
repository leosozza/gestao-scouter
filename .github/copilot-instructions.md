# Copilot Instructions for Gestão Scouter

## Project Overview

This is a React/TypeScript management system called "Gestão Scouter" (Scouter Management System) built with Vite. The application manages scouters/scouts with features including performance dashboards, lead management, payment processing, and integrations with external services.

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui with Radix UI components
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router DOM
- **Database**: Supabase
- **External Integrations**: Bitrix CRM, Google Sheets
- **PDF Generation**: jsPDF
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui components
│   ├── dashboard/    # Dashboard-specific components
│   └── layout/       # Layout components
├── pages/            # Route components
├── hooks/            # Custom React hooks
├── services/         # API services and integrations
├── repositories/     # Data access layer
├── layouts/          # Page layouts
├── utils/            # Utility functions
├── lib/              # Library configurations
└── data/             # Static data and types
```

## Coding Standards

### TypeScript
- **Strict Mode**: Always use strict TypeScript
- **No `any` types**: Replace `any` with proper types (current codebase has 115+ violations to fix)
- **Interface over Type**: Prefer interfaces for object shapes
- **Explicit return types**: Add return types for functions when not obvious

### React Best Practices
- **Functional Components**: Use functional components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Component Composition**: Prefer composition over complex props
- **Error Boundaries**: Implement error boundaries for critical sections
- **Performance**: Use React.memo, useMemo, useCallback appropriately

### Code Organization
- **Single Responsibility**: Each component/function should have one clear purpose
- **Consistent Naming**: Use descriptive, consistent naming conventions
- **File Structure**: Follow the established directory structure
- **Imports**: Use absolute imports with `@/` prefix

### State Management
- **React Query**: Use for server state management
- **Local State**: Use useState for component-local state
- **Form State**: Use React Hook Form for form management
- **Global State**: Minimize global state, prefer prop drilling or context when needed

## External Integrations

### Supabase
- Database operations should go through the repositories layer
- Use proper error handling for database operations
- Implement proper type safety for database queries

### Bitrix CRM
- API calls should use the `bitrixService`
- Handle authentication and rate limiting appropriately
- Implement proper error handling and retry logic

### Google Sheets
- Use `googleSheetsService` for spreadsheet operations
- Handle authentication through service accounts
- Implement batch operations where possible

## UI/UX Guidelines

### Design System
- Use shadcn/ui components consistently
- Follow the established color scheme and typography
- Maintain consistent spacing using Tailwind classes
- Ensure responsive design for all components

### User Experience
- Provide loading states for async operations
- Show appropriate error messages to users
- Implement proper form validation with clear feedback
- Use toast notifications for user actions

### Accessibility
- Ensure keyboard navigation works properly
- Use semantic HTML elements
- Provide proper ARIA labels where needed
- Maintain good color contrast ratios

## Performance Considerations

- **Code Splitting**: Implement route-based code splitting
- **Lazy Loading**: Use lazy loading for heavy components
- **Memoization**: Use React.memo for expensive renders
- **Virtual Scrolling**: Implement for large data lists
- **Image Optimization**: Optimize images and use proper formats

## Testing Guidelines

- Write unit tests for utility functions
- Test custom hooks independently
- Use React Testing Library for component tests
- Mock external API calls in tests
- Maintain good test coverage for critical paths

## Development Workflow

### Local Development
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Code Quality
- Fix all TypeScript errors before submitting code
- Ensure ESLint passes without errors
- Follow the existing code style and patterns
- Add proper error handling for all async operations

### Git Workflow
- Use descriptive commit messages
- Keep commits focused and atomic
- Test changes locally before committing
- Follow the existing branch naming conventions

## Common Patterns

### API Services
```typescript
// Use proper error handling and type safety
export const fetchData = async (): Promise<DataType[]> => {
  try {
    const response = await supabase
      .from('table_name')
      .select('*');
    
    if (response.error) throw response.error;
    return response.data || [];
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};
```

### Component Structure
```typescript
interface ComponentProps {
  // Always define proper prop types
  data: DataType[];
  onAction: (id: string) => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  // Component implementation
};
```

### Form Handling
```typescript
// Use React Hook Form with Zod validation
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    // Define default values
  },
});
```

## Security Considerations

- **Environment Variables**: Never commit secrets, use proper env vars
- **Input Validation**: Validate all user inputs with Zod schemas
- **API Security**: Implement proper authentication for API calls
- **Data Sanitization**: Sanitize data before displaying or processing

## Maintenance Notes

- **Current Issues**: The codebase has 129 linting errors (mainly TypeScript `any` types)
- **Priority**: Focus on type safety improvements
- **Dependencies**: Keep dependencies updated and secure
- **Performance**: Monitor bundle size and runtime performance

When making changes to this codebase, prioritize type safety, follow the established patterns, and ensure all new code adheres to these guidelines.