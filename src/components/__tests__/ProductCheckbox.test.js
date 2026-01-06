import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCheckbox from '../ProductCheckbox';

describe('ProductCheckbox Component', () => {
  const defaultProps = {
    checked: false,
    disabled: false,
    onChange: jest.fn(),
    label: 'Test Product',
    volume: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render checkbox with correct label and volume', () => {
      render(<ProductCheckbox {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/100 shipments/i)).toBeInTheDocument();
    });

    it('should render checked checkbox when checked prop is true', () => {
      render(<ProductCheckbox {...defaultProps} checked={true} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should render unchecked checkbox when checked prop is false', () => {
      render(<ProductCheckbox {...defaultProps} checked={false} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render disabled checkbox when disabled prop is true', () => {
      render(<ProductCheckbox {...defaultProps} disabled={true} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should format large volume numbers with commas', () => {
      render(<ProductCheckbox {...defaultProps} volume={1234567} />);
      
      expect(screen.getByText(/1,234,567 shipments/i)).toBeInTheDocument();
    });

    it('should render zero volume correctly', () => {
      render(<ProductCheckbox {...defaultProps} volume={0} />);
      
      expect(screen.getByText(/0 shipments/i)).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onChange with true when unchecked checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<ProductCheckbox {...defaultProps} checked={false} onChange={onChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with false when checked checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<ProductCheckbox {...defaultProps} checked={true} onChange={onChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('should not call onChange when disabled checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<ProductCheckbox {...defaultProps} disabled={true} onChange={onChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should stop event propagation on click', () => {
      const onChange = jest.fn();
      const onParentClick = jest.fn();
      
      const { container } = render(
        <div onClick={onParentClick}>
          <ProductCheckbox {...defaultProps} onChange={onChange} />
        </div>
      );
      
      const checkbox = container.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);
      
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onParentClick).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should apply reduced opacity when disabled', () => {
      const { container } = render(<ProductCheckbox {...defaultProps} disabled={true} />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ opacity: 0.5 });
    });

    it('should apply full opacity when enabled', () => {
      const { container } = render(<ProductCheckbox {...defaultProps} disabled={false} />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ opacity: 1 });
    });

    it('should disable pointer events on wrapper when disabled', () => {
      const { container } = render(<ProductCheckbox {...defaultProps} disabled={true} />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ pointerEvents: 'none' });
    });

    it('should enable pointer events on wrapper when not disabled', () => {
      const { container } = render(<ProductCheckbox {...defaultProps} disabled={false} />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ pointerEvents: 'auto' });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible when not disabled', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<ProductCheckbox {...defaultProps} onChange={onChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      
      await user.keyboard(' '); // Space key to toggle
      
      expect(onChange).toHaveBeenCalled();
    });

    it('should prevent text selection on label', () => {
      const { container } = render(<ProductCheckbox {...defaultProps} />);
      
      const label = container.querySelector('span');
      expect(label).toHaveStyle({ userSelect: 'none' });
    });

    it('should have appropriate cursor style', () => {
      const { container } = render(<ProductCheckbox {...defaultProps} />);
      
      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(checkbox).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid clicks correctly', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<ProductCheckbox {...defaultProps} onChange={onChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);
      
      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('should handle negative volume gracefully', () => {
      render(<ProductCheckbox {...defaultProps} volume={-100} />);
      
      // Should still render, though negative volumes shouldn't happen in practice
      expect(screen.getByText(/-100 shipments/i)).toBeInTheDocument();
    });

    it('should handle very large volume numbers', () => {
      render(<ProductCheckbox {...defaultProps} volume={999999999} />);
      
      expect(screen.getByText(/999,999,999 shipments/i)).toBeInTheDocument();
    });

    it('should handle empty label gracefully', () => {
      render(<ProductCheckbox {...defaultProps} label="" />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });
});


