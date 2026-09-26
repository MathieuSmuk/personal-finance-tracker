import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import AccountCard from "./AccountCard";

const exampleAccount = {
  id: 1,
  name: "Everyday Chequing",
  account_type: "chequing",
  opening_balance: "1250.50",
  is_archived: false,
};

function renderAccountCard(accountOverrides = {}) {
  const account = {
    ...exampleAccount,
    ...accountOverrides,
  };

  const onAccountChanged = vi.fn();
  const user = userEvent.setup();

  render(<AccountCard account={account} onAccountChanged={onAccountChanged} />);

  return {
    account,
    onAccountChanged,
    user,
  };
}

describe("AccountCard", () => {
  test("displays the account information", () => {
    renderAccountCard();

    expect(
      screen.getByRole("heading", {
        name: "Everyday Chequing",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Chequing")).toBeInTheDocument();
    expect(screen.getByText("$1,250.50")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Edit",
      }),
    ).toBeEnabled();

    expect(
      screen.getByRole("button", {
        name: "Archive",
      }),
    ).toBeEnabled();
  });

  test("allows the user to edit the controlled account fields", async () => {
    const { user } = renderAccountCard();

    await user.click(
      screen.getByRole("button", {
        name: "Edit",
      }),
    );

    const nameInput = screen.getByRole("textbox", {
      name: "Account Name",
    });

    const typeSelect = screen.getByRole("combobox", {
      name: "Account Type",
    });

    const balanceInput = screen.getByRole("spinbutton", {
      name: "Opening Balance",
    });

    expect(nameInput).toHaveValue("Everyday Chequing");
    expect(typeSelect).toHaveValue("chequing");
    expect(balanceInput).toHaveValue(1250.5);

    await user.clear(nameInput);
    await user.type(nameInput, "Emergency Fund");

    await user.selectOptions(typeSelect, "savings");

    await user.clear(balanceInput);
    await user.type(balanceInput, "2000.75");

    expect(nameInput).toHaveValue("Emergency Fund");
    expect(typeSelect).toHaveValue("savings");
    expect(balanceInput).toHaveValue(2000.75);
  });

  test("restores the original values when editing is cancelled", async () => {
    const { user } = renderAccountCard();

    await user.click(
      screen.getByRole("button", {
        name: "Edit",
      }),
    );

    const nameInput = screen.getByRole("textbox", {
      name: "Account Name",
    });

    await user.clear(nameInput);
    await user.type(nameInput, "Temporary Name");

    expect(nameInput).toHaveValue("Temporary Name");

    await user.click(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Everyday Chequing",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("textbox", {
        name: "Account Name",
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Edit",
      }),
    );

    expect(
      screen.getByRole("textbox", {
        name: "Account Name",
      }),
    ).toHaveValue("Everyday Chequing");
  });

  test("shows an error when the account name contains only spaces", async () => {
    const { onAccountChanged, user } = renderAccountCard();

    await user.click(
      screen.getByRole("button", {
        name: "Edit",
      }),
    );

    const nameInput = screen.getByRole("textbox", {
      name: "Account Name",
    });

    await user.clear(nameInput);
    await user.type(nameInput, "   ");

    await user.click(
      screen.getByRole("button", {
        name: "Save Changes",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter an account name.",
    );

    expect(onAccountChanged).not.toHaveBeenCalled();
  });
});
